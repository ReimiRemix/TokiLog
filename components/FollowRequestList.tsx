import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';

interface FollowRequest {
  request_id: string;
  follower_id: string;
  follower_username: string;
  follower_display_name: string | null;
  created_at: string;
}

const FollowRequestList: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error } = useQuery<FollowRequest[]>({
    queryKey: ['pendingFollowRequests'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_follow_requests');
      if (error) {
        throw error;
      }
      return data || [];
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('accept_follow_request', { p_request_id: requestId });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingFollowRequests'] });
      alert('フォローリクエストを承認しました！');
    },
    onError: (err: any) => {
      console.error('Error accepting follow request:', err);
      alert('フォローリクエストの承認に失敗しました: ' + err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('reject_follow_request', { p_request_id: requestId });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingFollowRequests'] });
      alert('フォローリクエストを拒否しました。');
    },
    onError: (err: any) => {
      console.error('Error rejecting follow request:', err);
      alert('フォローリクエストの拒否に失敗しました: ' + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">リクエストを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">エラー: {error.message}</div>;
  }

  if (!requests || requests.length === 0) {
    return <div className="text-light-text-secondary dark:text-dark-text-secondary p-4 text-center">保留中のフォローリクエストはありません。</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">フォローリクエスト</h2>
      <div className="space-y-3">
        {requests.map((request) => (
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
  );
};

export default FollowRequestList;
