import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageCircle, Send, Image as ImageIcon, X, ArrowLeft, Ban } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string | null;
  image_url: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  status: string;
}

interface UserProfile {
  support_banned: boolean;
}

const LiveChatPage = () => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    checkBanStatus();
    loadConversation();
  }, []);

  useEffect(() => {
    if (conversation) {
      loadMessages();
      subscribeToMessages();
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const checkBanStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('support_banned')
      .eq('id', session.user.id)
      .single();

    if (profile?.support_banned) {
      setIsBanned(true);
    }
  };

  const loadConversation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading conversation:', error);
    } else if (data) {
      setConversation(data);
    }
  };

  const loadMessages = async () => {
    if (!conversation) return;

    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages((data || []) as Message[]);
    }
  };

  const subscribeToMessages = () => {
    if (!conversation) return;

    const channel = supabase
      .channel('support-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const startConversation = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to start a conversation");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('support_conversations')
      .insert({
        user_id: session.user.id,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to start conversation");
      console.error(error);
    } else {
      setConversation(data);
      toast.success("Conversation started!");
    }
    setLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const fileExt = selectedImage.name.split('.').pop();
    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('support-images')
      .upload(fileName, selectedImage);

    if (error) {
      toast.error("Failed to upload image");
      console.error(error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('support-images')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const sendMessage = async () => {
    if (!conversation || (!newMessage.trim() && !selectedImage)) return;

    setLoading(true);
    setUploading(!!selectedImage);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to send messages");
      setLoading(false);
      return;
    }

    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await uploadImage();
      if (!imageUrl) {
        setLoading(false);
        setUploading(false);
        return;
      }
    }

    const { error } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: session.user.id,
        sender_type: 'user',
        message: newMessage.trim() || null,
        image_url: imageUrl
      });

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
    } else {
      setNewMessage("");
      setSelectedImage(null);
      setImagePreview(null);
    }
    setLoading(false);
    setUploading(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 md:pt-20 bg-background">
      <DesktopNav isAuthenticated={true} />
      
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/profile")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Button>
        </div>

        <Card className="h-[calc(100vh-200px)] md:h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Customer Support Chat
            </CardTitle>
            <CardDescription>
              {conversation ? 'Chat with our support team' : 'Start a conversation with support'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
            {isBanned ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <Ban className="w-16 h-16 text-destructive" />
                <p className="text-lg font-semibold text-destructive">You have been banned from support chat</p>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Please contact us through an alternative method if you need assistance.
                </p>
              </div>
            ) : !conversation ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <MessageCircle className="w-16 h-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Need help? Our support team is here to assist you with any questions or issues.
                </p>
                <Button onClick={startConversation} disabled={loading} size="lg">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Live Chat
                </Button>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/20" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.sender_type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.sender_type === 'admin' && (
                            <p className="text-xs font-semibold mb-1 opacity-70">Support Team</p>
                          )}
                          {msg.message && <p className="text-sm break-words">{msg.message}</p>}
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="Uploaded"
                              className="mt-2 rounded max-w-full h-auto cursor-pointer"
                              onClick={() => window.open(msg.image_url!, '_blank')}
                            />
                          )}
                          <p className="text-xs opacity-70 mt-1">{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="h-20 rounded border" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="min-h-[60px] resize-none"
                    disabled={loading}
                  />
                  <Button onClick={sendMessage} disabled={loading || (!newMessage.trim() && !selectedImage)}>
                    {uploading ? "Uploading..." : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav isAuthenticated={true} />
    </div>
  );
};

export default LiveChatPage;
