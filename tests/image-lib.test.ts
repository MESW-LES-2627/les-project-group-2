import { describe, it, expect, vi, beforeEach } from 'vitest'
import { savePicture, removeImage } from '@/app/image_manager/image_lib'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

const mockSharpToBuffer = vi.fn()
const mockSharpPng = vi.fn(() => ({ toBuffer: mockSharpToBuffer }))
vi.mock('sharp', () => ({
  default: vi.fn(() => ({ png: mockSharpPng })),
}))

describe('image_lib', () => {
  let mockStorageUpload: ReturnType<typeof vi.fn>
  let mockStorageRemove: ReturnType<typeof vi.fn>
  let mockStorageGetPublicUrl: ReturnType<typeof vi.fn>
  let mockAuthGetUser: ReturnType<typeof vi.fn>
  let mockSupabase: unknown

  beforeEach(() => {
    vi.clearAllMocks()

    mockStorageUpload = vi.fn().mockResolvedValue({ error: null })
    mockStorageRemove = vi.fn().mockResolvedValue({ error: null })
    mockStorageGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/profile_pics/user123.png' },
    })
    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user123' } },
    })

    mockSupabase = {
      auth: {
        getUser: mockAuthGetUser,
      },
      storage: {
        from: vi.fn(() => ({
          upload: mockStorageUpload,
          remove: mockStorageRemove,
          getPublicUrl: mockStorageGetPublicUrl,
        })),
      },
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    )
    mockSharpToBuffer.mockResolvedValue(Buffer.from('mock-png-buffer'))
  })

  describe('savePicture', () => {
    it('returns error when file is missing or empty', async () => {
      const formData = new FormData()
      const res = await savePicture(formData, 'user123', 'profile_pics')
      expect(res).toEqual({ error: 'The file is...empty...?' })
    })

    it('returns error when file size exceeds 15MB', async () => {
      const formData = new FormData()
      const largeFile = new File(['x'], 'avatar.png', { type: 'image/png' })
      Object.defineProperty(largeFile, 'size', { value: 16 * 1024 * 1024 })
      formData.append('file', largeFile)

      const res = await savePicture(formData, 'user123', 'profile_pics')
      expect(res).toEqual({ error: 'Máx. 15MB' })
    })

    it('returns error when sharp conversion fails', async () => {
      mockSharpToBuffer.mockRejectedValueOnce(new Error('Sharp conversion error'))
      const formData = new FormData()
      const file = new File(['valid'], 'avatar.jpg', { type: 'image/jpeg' })
      formData.append('profile_pic', file)

      const res = await savePicture(formData, 'user123', 'profile_pics')
      expect(res).toEqual({
        error: 'Something went wrong while converting the image to png',
      })
    })

    it('returns error when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValueOnce({ data: { user: null } })
      const formData = new FormData()
      const file = new File(['valid'], 'avatar.png', { type: 'image/png' })
      formData.append('file', file)

      const res = await savePicture(formData, 'user123', 'profile_pics')
      expect(res).toEqual({
        error: 'Access Denied: A non authenticated user tried to access the bucket',
      })
    })

    it('returns error when supabase storage upload fails', async () => {
      mockStorageUpload.mockResolvedValueOnce({
        error: { message: 'Storage upload failed' },
      })
      const formData = new FormData()
      const file = new File(['valid'], 'avatar.png', { type: 'image/png' })
      formData.append('file', file)

      const res = await savePicture(formData, 'user123', 'profile_pics')
      expect(res).toEqual({ error: 'Storage upload failed' })
    })

    it('successfully uploads and returns public url', async () => {
      const formData = new FormData()
      const file = new File(['valid'], 'avatar.png', { type: 'image/png' })
      formData.append('profile_pic', file)

      const res = await savePicture(
        formData,
        'user123',
        'profile_pics',
        mockSupabase as SupabaseClient
      )
      expect(res.success).toBe(true)
      expect(res.url).toContain('https://example.com/profile_pics/user123.png')
    })
  })

  describe('removeImage', () => {
    it('returns error when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValueOnce({ data: { user: null } })
      const res = await removeImage('profile_pics', 'user123')
      expect(res).toEqual({
        error: 'A non-authenticated user is not allowed to delete images',
      })
    })

    it('returns error when remove fails', async () => {
      mockStorageRemove.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      })
      const res = await removeImage('profile_pics', 'user123')
      expect(res).toEqual({ error: 'Delete failed' })
    })

    it('successfully deletes image', async () => {
      const res = await removeImage(
        'profile_pics',
        'user123',
        mockSupabase as SupabaseClient
      )
      expect(res).toBe(true)
    })
  })
})
