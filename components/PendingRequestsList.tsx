import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';
import { getPendingFollowRequests } from '../services/followService';
import { User } from '@supabase/supabase-js';

interface ReceivedFollowRequest {
  request_id: string;
  follower_id: string;
  follower_username: string;
  follower_display_name: string | null;
  created_at: string;
}

interface SentFollowRequest {
  request_id: string;
  addressee_id: string;
  addressee_username: string;
  addressee_display_name: string | null;
  created_at: string;
}

const PendingRequestsList: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: Infinity, // We don't need to refetch the user frequently
  });

  // Fetch received follow requests
  const { data: receivedRequests, isLoading: isLoadingReceived, error: errorReceived } = useQuery({
    queryKey: ['receivedFollowRequests', currentUser?.id],
    queryFn: getPendingFollowRequests, // Use the imported service function
    enabled: !!currentUser, // This query will only run when currentUser is available
  });

  // TODO: Fetch sent follow requests (requires a new RPC function in Supabase)
  const { data: sentRequests, isLoading: isLoadingSent, error: errorSent } = useQuery<SentFollowRequest[]>({
    queryKey: ['sentFollowRequests', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      // Placeholder for fetching sent requests
      // You would need a new RPC function like 'get_sent_follow_requests'
      // const { data, error } = await supabase.rpc('get_sent_follow_requests');
      // if (error) {
      //   throw error;
      // }
      // return data || [];
      return []; // Return empty for now
    },
    enabled: !!currentUser,
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('follow_relationships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedFollowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      alert('フォローリクエストを承認しました！');
    },
    onError: (err: any) => {
      console.error('Error accepting follow request:', err);
      alert('フォローリクエストの承認に失敗しました: ' + err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('follow_relationships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedFollowRequests'] });
      alert('フォローリクエストを拒否しました。');
    },
    onError: (err: any) => {
      console.error('Error rejecting follow request:', err);
      alert('フォローリクエストの拒否に失敗しました: ' + err.message);
    },
  });

  const cancelSentRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      // TODO: Implement RPC function for canceling sent follow request
      // const { error } = await supabase.rpc('cancel_follow_request', { p_request_id: requestId });
      // if (error) {
      //   throw error;
      // }
      console.log('Canceling sent request:', requestId); // Placeholder
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentFollowRequests'] });
      alert('送信したフォローリクエストをキャンセルしました。');
    },
    onError: (err: any) => {
      console.error('Error canceling sent follow request:', err);
      alert('送信したフォローリクエストのキャンセルに失敗しました: ' + err.message);
    },
  });

  if (isLoadingReceived || isLoadingSent) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">リクエストを読み込み中...</span>
      </div>
    );
  }

  if (errorReceived) {
    return <div className="text-red-500 p-4">受信リクエストのエラー: {errorReceived.message}</div>;
  }

  if (errorSent) {
    return <div className="text-red-500 p-4">送信リクエストのエラー: {errorSent.message}</div>;
  }

  const hasRequests = (receivedRequests && receivedRequests.length > 0) || (sentRequests && sentRequests.length > 0);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">保留中リクエスト</h2>

      {!hasRequests && (
        <div className="text-light-text-secondary dark:text-dark-text-secondary p-4 text-center">保留中のフォローリクエストはありません。</div>
      )}

      {receivedRequests && receivedRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3 text-light-text dark:text-dark-text">受信したリクエスト</h3>
          <div className="space-y-3">
            {receivedRequests.map((request) => (
              <div key={request.request_id} className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border">
                <div>
                  <p className="font-semibold text-light-text dark:text-dark-text">
                    {request.follower_display_name || request.follower_username}
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    @{request.follower_username} からのリクエスト
                  </p>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptMutation.mutate(request.request_id)}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                    className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(request.request_id)}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sentRequests && sentRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-3 text-light-text dark:text-dark-text">送信したリクエスト</h3>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <div key={request.request_id} className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border">
                <div>
                  <p className="font-semibold text-light-text dark:text-dark-text">
                    {request.addressee_display_name || request.addressee_username}
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    @{request.addressee_username} へのリクエスト
                  </p>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => cancelSentRequestMutation.mutate(request.request_id)}
                    disabled={cancelSentRequestMutation.isPending}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                  >
                    <XIcon className="w-5 h-5" /> キャンセル
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingRequestsList;