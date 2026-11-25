'use client'

/**
 * @file components/map/PinComments.tsx
 * @brief Collapsible discussion under a pin: shows the comments and lets members add and delete their own.
 */

import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import type { PinComment } from '@/types/map'
import { MAX_COMMENT_LENGTH, formatCommentDate } from '@/utils/pin-comments'

interface PinCommentsProps {
  comments: PinComment[]
  currentUserId?: string
  onAdd: (body: string) => Promise<{ error?: string }>
  onDelete: (commentId: string) => Promise<{ error?: string }>
}

/**
 * @brief Discussion thread of a pin. Each comment shows its author and date, and its author can delete it.
 * @param props Component properties.
 */
export function PinComments({ comments, currentUserId, onAdd, onDelete }: PinCommentsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  // Keep the newest comment in view when the thread is opened or a comment is added.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [isOpen, comments.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) {
      setError('Write a comment before sending it.')
      return
    }

    setIsSending(true)
    const result = await onAdd(body)
    setIsSending(false)

    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    setDraft('')
  }

  const handleDelete = async (commentId: string) => {
    const result = await onDelete(commentId)
    setError(result.error ?? null)
  }

  return (
    <div className="mt-3.5 pt-3 border-t border-slate-100">
      <button
        type="button"
        data-testid="toggle-pin-comments"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Comments ({comments.length})</span>
      </button>

      {isOpen && (
        <div data-testid="pin-comments" className="mt-2.5">
          {comments.length === 0 ? (
            <p data-testid="pin-comments-empty" className="text-[11px] text-slate-500">
              No comments yet. Start the discussion.
            </p>
          ) : (
            <ul ref={listRef} className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  data-testid={`pin-comment-${comment.id}`}
                  className="rounded-lg bg-slate-50 px-2.5 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-semibold text-slate-700">
                      <span data-testid="pin-comment-author">{comment.authorName}</span>
                      <span className="font-normal text-slate-400"> · </span>
                      <span data-testid="pin-comment-date" className="font-normal text-slate-500">
                        {formatCommentDate(comment.createdAt)}
                      </span>
                    </p>
                    {currentUserId && comment.userId === currentUserId && (
                      <button
                        type="button"
                        data-testid={`delete-pin-comment-${comment.id}`}
                        aria-label="Delete comment"
                        onClick={() => handleDelete(comment.id)}
                        className="rounded p-0.5 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p
                    data-testid="pin-comment-body"
                    className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-700"
                  >
                    {comment.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" data-testid="pin-comment-error" className="mt-2 text-[11px] text-rose-600">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-2.5 flex items-end gap-2">
            <textarea
              data-testid="pin-comment-input"
              aria-label="Write a comment"
              value={draft}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Write a comment..."
              className="min-w-0 flex-1 resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              data-testid="send-pin-comment"
              disabled={isSending}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
