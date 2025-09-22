import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Restaurant, ChatMessage, ChatHistory } from '../types';
import LoadingSpinner from './icons/LoadingSpinner';
import SparklesIcon from './icons/SparklesIcon';
import PlusIcon from './icons/PlusIcon';
import MessageSquareIcon from './icons/MessageSquareIcon';
import TrashIcon from './icons/TrashIcon';
import SendIcon from './icons/SendIcon';
import { twMerge } from 'tailwind-merge';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';

interface AIAnalysisViewProps {
  restaurants: Restaurant[];
  user: User;
  onScrollToRestaurant: (restaurantId: string) => void;
}

interface RecommendationResult {
  recommendations: { id: string; name: string; reason: string }[];
  summary: string;
}

const MAX_CHAT_HISTORY = 10;

const AIAnalysisView: React.FC<AIAnalysisViewProps> = ({ restaurants, user, onScrollToRestaurant }) => {
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | 'new'>('new');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { data: chatHistories = [] } = useQuery<ChatHistory[]>({
    queryKey: ['chatHistories', user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('chat_histories').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const createChatMutation = useMutation({
    mutationFn: async ({ firstUserMessage, firstModelMessage }: { firstUserMessage: ChatMessage; firstModelMessage: ChatMessage }) => {
      const title = firstUserMessage.content.substring(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '');
      const { data, error } = await supabase.from('chat_histories').insert({
        user_id: user.id,
        title: title,
        messages: [firstUserMessage, firstModelMessage],
      }).select().single();
      if (error) throw new Error(error.message);
      return data as ChatHistory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatHistories', user.id] });
      setSelectedChatId(data.id);
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: async ({ chatId, updatedMessages }: { chatId: string; updatedMessages: ChatMessage[] }) => {
      const { error } = await supabase.from('chat_histories').update({ messages: updatedMessages }).eq('id', chatId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatHistories', user.id] });
    },
  });
  
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase.from('chat_histories').delete().eq('id', chatId);
      if (error) throw new Error(error.message);
      return chatId;
    },
    onSuccess: (deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ['chatHistories', user.id] });
      if (selectedChatId === deletedChatId) {
        setSelectedChatId('new');
        setMessages([]);
      }
    },
  });

  const recommendationMutation = useMutation({
    mutationFn: async ({ userQuery, restaurantList, history }: { userQuery: string; restaurantList: Restaurant[], history: ChatMessage[] }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch('/.netlify/functions/log-api-usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ api_type: 'gemini-recommend' }),
        });
      }
      const response = await fetch('/.netlify/functions/gemini-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery, restaurants: restaurantList, history }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AIによる推薦の生成に失敗しました。');
      }
      return (await response.json()) as RecommendationResult;
    },
    onSuccess: (data, variables) => {
        const userMessage: ChatMessage = { role: 'user', content: variables.userQuery };
        const aiMessage: ChatMessage = { role: 'model', content: JSON.stringify(data) };
        const updatedMessages = [...variables.history, userMessage, aiMessage];
        setMessages(updatedMessages);

        if (selectedChatId !== 'new') {
            updateChatMutation.mutate({ chatId: selectedChatId, updatedMessages });
        } else {
            createChatMutation.mutate({ firstUserMessage: userMessage, firstModelMessage: aiMessage });
        }
    },
    onError: (error, variables) => {
      console.error("AI recommendation failed:", error);
      const userMessage: ChatMessage = { role: 'user', content: variables.userQuery };
      const errorMessage: ChatMessage = { role: 'model', content: `申し訳ありません、エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` };
      const updatedMessages = [...variables.history, userMessage, errorMessage];
      setMessages(updatedMessages);
       if (selectedChatId !== 'new') {
            updateChatMutation.mutate({ chatId: selectedChatId, updatedMessages });
        } else {
            createChatMutation.mutate({ firstUserMessage: userMessage, firstModelMessage: errorMessage });
        }
    }
  });

  useEffect(() => {
    if (selectedChatId === 'new') {
      setMessages([]);
    } else {
      const selectedChat = chatHistories.find(h => h.id === selectedChatId);
      setMessages(selectedChat?.messages || []);
    }
  }, [selectedChatId, chatHistories]);
  
  useEffect(() => {
      if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = userInput.trim();
    if (!query || recommendationMutation.isPending) return;

    if (selectedChatId === 'new' && chatHistories.length >= MAX_CHAT_HISTORY) {
        alert(`チャット履歴は${MAX_CHAT_HISTORY}件までです。新しいチャットを開始するには、既存の履歴を削除してください。`);
        return;
    }

    const currentHistory = [...messages];
    setMessages([...currentHistory, { role: 'user', content: query }]);
    setUserInput('');

    recommendationMutation.mutate({ userQuery: query, restaurantList: restaurants, history: currentHistory });
  };

  const parseAndRenderContent = (content: string) => {
    try {
        const data = JSON.parse(content) as RecommendationResult;
        if(data.recommendations && data.summary) {
            return (
                <div className="space-y-3">
                    <p className="text-sm whitespace-pre-wrap mb-4">{data.summary}</p>
                    {data.recommendations.map(rec => (
                        <button 
                          key={rec.id} 
                          onClick={() => onScrollToRestaurant(rec.id)} 
                          className="w-full text-left p-3 bg-white dark:bg-slate-800 rounded-lg border border-light-border dark:border-dark-border transition-all hover:shadow-md hover:border-light-primary/50 dark:hover:border-dark-primary/50"
                        >
                            <p className="font-semibold text-light-primary dark:text-dark-primary">{rec.name}</p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">{rec.reason}</p>
                        </button>
                    ))}
                </div>
            );
        }
    } catch (e) {}
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }

  if (restaurants.length === 0) {
    return (
        <div className="text-center py-16 px-6 bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border">
            <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text">まずはお店をお気に入りに登録しましょう</h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">AI相談機能は、あなたがお気に入り登録したお店の中から最適なものを推薦します。</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-slide-down">
      {/* Left Pane: Chat History */}
      <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col bg-light-card dark:bg-dark-card p-3 rounded-xl shadow-soft border border-light-border dark:border-dark-border">
        <div className="p-2">
          <button
            onClick={() => setSelectedChatId('new')}
            className="flex-shrink-0 flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold rounded-lg bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors"
          >
            <PlusIcon /><span>新しいチャット</span>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto space-y-1 mt-2 -mr-2 pr-2">
            {chatHistories.length === 0 && (
                <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary mt-4 px-4">まだチャット履歴がありません。</p>
            )}
            {chatHistories.map(chat => (
                <div key={chat.id} className={twMerge(
                    "group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors",
                    selectedChatId === chat.id ? "bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg" : "hover:bg-slate-100 dark:hover:bg-slate-700/50"
                )}>
                    <div onClick={() => setSelectedChatId(chat.id)} className="flex-grow flex items-center gap-2.5 truncate">
                        <MessageSquareIcon className={twMerge("w-5 h-5 flex-shrink-0", selectedChatId === chat.id ? "text-light-primary dark:text-dark-primary" : "text-light-text-secondary dark:text-dark-text-secondary")} />
                        <span className={twMerge("text-sm truncate", selectedChatId === chat.id ? "font-semibold text-light-primary dark:text-dark-primary" : "text-light-text dark:text-dark-text")}>{chat.title}</span>
                    </div>
                    <button onClick={() => deleteChatMutation.mutate(chat.id)} disabled={deleteChatMutation.isPending && deleteChatMutation.variables === chat.id} className="flex-shrink-0 p-1.5 text-light-text-secondary dark:text-dark-text-secondary rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                        {deleteChatMutation.isPending && deleteChatMutation.variables === chat.id ? <SmallLoadingSpinner/> : <TrashIcon className="w-4 h-4"/>}
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Right Pane: Chat Window */}
      <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col bg-light-card dark:bg-dark-card rounded-xl shadow-soft border border-light-border dark:border-dark-border">
          <div ref={chatContainerRef} className="flex-grow p-6 space-y-6 overflow-y-auto">
              {messages.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg flex items-center justify-center mb-4">
                      <SparklesIcon className="w-8 h-8 text-light-primary dark:text-dark-primary"/>
                    </div>
                    <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">AIに相談しましょう</h3>
                    <p className="text-base text-light-text-secondary dark:text-dark-text-secondary mt-1">「辛いものが食べたい」「記念日におすすめのお店は？」など、気分やシーンを伝えてみてください。</p>
                 </div>
              )}
              {messages.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'model' && <div className="flex-shrink-0 w-10 h-10 rounded-full bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-light-primary dark:text-dark-primary"/></div>}
                      <div className={`max-w-2xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900 rounded-br-none' : 'bg-slate-100 dark:bg-slate-700/50 rounded-bl-none'}`}>
                          {msg.role === 'model' ? parseAndRenderContent(msg.content) : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                      </div>
                  </div>
              ))}
               {recommendationMutation.isPending && (
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-light-primary dark:text-dark-primary"/></div>
                        <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-2xl rounded-bl-none"><LoadingSpinner/></div>
                    </div>
                )}
          </div>
          <div className="p-4 border-t border-light-border dark:border-dark-border">
              {chatHistories.length >= MAX_CHAT_HISTORY && selectedChatId === 'new' && (
                  <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-sm">
                      <AlertTriangleIcon className="w-10 h-10 flex-shrink-0" />
                      <span>チャット履歴の上限に達しました。新しいチャットを始めるには、左のリストから既存の履歴を削除してください。</span>
                  </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="AIに相談する..."
                      disabled={recommendationMutation.isPending || (chatHistories.length >= MAX_CHAT_HISTORY && selectedChatId === 'new')}
                      className="flex-grow w-full px-4 py-3 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-xl focus:ring-2 focus:ring-light-primary focus:border-light-primary placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary disabled:opacity-50 transition"
                  />
                  <button
                      type="submit"
                      disabled={!userInput.trim() || recommendationMutation.isPending || (chatHistories.length >= MAX_CHAT_HISTORY && selectedChatId === 'new')}
                      className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-50"
                  >
                      {recommendationMutation.isPending ? <SmallLoadingSpinner /> : <SendIcon className="w-6 h-6" />}
                  </button>
              </form>
          </div>
      </div>
    </div>
  );
};

export default AIAnalysisView;