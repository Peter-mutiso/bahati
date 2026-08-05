import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageCircle, Send, User, Image as ImageIcon, X, Ban, UserCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
  user_id: string;
  status: string;
  created_at: string;
  last_message_at: string;
  profiles?: {
    email: string;
    support_banned: boolean;
  };
}

export const SupportChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
    subscribeToConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      subscribeToMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    const { data: convData, error: convError } = await supabase
      .from('support_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('Error loading conversations:', convError);
      return;
    }

    // Fetch profiles separately
    const conversationsWithProfiles = await Promise.all(
      (convData || []).map(async (conv) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, support_banned')
          .eq('id', conv.user_id)
          .single();
        
        return {
          ...conv,
          profiles: profile || { email: 'Unknown', support_banned: false }
        };
      })
    );

    setConversations(conversationsWithProfiles as Conversation[]);
  };

  const subscribeToConversations = () => {
    const channel = supabase
      .channel('admin-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;

    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', selectedConversation.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages((data || []) as Message[]);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel('admin-support-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
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
    const fileName = `admin/${Date.now()}.${fileExt}`;

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
    if (!selectedConversation || (!newMessage.trim() && !selectedImage)) return;

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
        conversation_id: selectedConversation.id,
        sender_id: session.user.id,
        sender_type: 'admin',
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

  const closeConversation = async () => {
    if (!selectedConversation) return;

    const { error } = await supabase
      .from('support_conversations')
      .update({ status: 'closed' })
      .eq('id', selectedConversation.id);

    if (error) {
      toast.error("Failed to close conversation");
    } else {
      toast.success("Conversation closed");
      setSelectedConversation(null);
      loadConversations();
    }
  };

  const toggleSupportBan = async () => {
    if (!selectedConversation) return;

    const isBanned = selectedConversation.profiles?.support_banned || false;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        support_banned: !isBanned,
        support_banned_at: !isBanned ? new Date().toISOString() : null
      })
      .eq('id', selectedConversation.user_id);

    if (error) {
      toast.error("Failed to update ban status");
      console.error(error);
    } else {
      toast.success(isBanned ? "User unbanned from support chat" : "User banned from support chat");
      loadConversations();
      // Update local state
      setSelectedConversation(prev => prev ? {
        ...prev,
        profiles: { ...prev.profiles!, support_banned: !isBanned }
      } : null);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conversations
          </CardTitle>
          <CardDescription>Active support chats</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[480px]">
            <div className="space-y-2">
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No conversations yet
                </p>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.profiles?.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(conv.last_message_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant={conv.status === 'open' ? 'default' : 'secondary'}>
                        {conv.status}
                      </Badge>
                      {conv.profiles?.support_banned && (
                        <Badge variant="destructive" className="text-xs">
                          Banned
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {selectedConversation ? selectedConversation.profiles?.email || 'Chat' : 'Select a conversation'}
              </CardTitle>
              <CardDescription>
                {selectedConversation ? 'Respond to user inquiries' : 'Choose a conversation to start chatting'}
              </CardDescription>
            </div>
            {selectedConversation && (
              <div className="flex gap-2">
                {selectedConversation.profiles?.support_banned ? (
                  <Button size="sm" variant="outline" onClick={toggleSupportBan} className="gap-1">
                    <UserCheck className="w-4 h-4" />
                    Unban User
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={toggleSupportBan} className="gap-1">
                    <Ban className="w-4 h-4" />
                    Ban User
                  </Button>
                )}
                {selectedConversation.status === 'open' && (
                  <Button size="sm" variant="outline" onClick={closeConversation}>
                    Close Chat
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedConversation ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[380px] border rounded-lg p-4 bg-muted/20" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender_type === 'admin'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
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

              {selectedConversation.status === 'open' && (
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
                    placeholder="Type your response..."
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
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
