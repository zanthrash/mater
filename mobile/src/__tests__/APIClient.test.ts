import axios from 'axios'
import { APIClient } from '../services/APIClient'

jest.mock('axios')

describe('APIClient', () => {
  describe('analyzeImages', () => {
    it('posts to /api/analyze/images and returns response', async () => {
      const mockResponse = {
        data: {
          storedPhotos: [{ url: 'http://example.com/photo.jpg', type: 'detail' }],
          analysis: {
            make: 'Caterpillar',
            model: '320',
            year: 2018,
            engineType: null,
            transmission: null,
            gvwLbs: null,
            hoursOnMeter: null,
            conditionSummary: null,
            confidenceScore: 0.9,
          },
        },
      }

      // axios.create returns an object with .post; mock at the instance level
      const mockPost = jest.fn().mockResolvedValue(mockResponse)
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      const result = await client.analyzeImages({
        inspectionId: 'test-id',
        photos: [{ base64: 'abc', type: 'detail' }],
      })

      expect(result.analysis.make).toBe('Caterpillar')
      expect(result.storedPhotos).toHaveLength(1)
    })

    it('throws ServiceError on failure', async () => {
      const mockPost = jest.fn().mockRejectedValue({
        response: { data: { error: 'Claude unavailable' } },
        message: 'Request failed',
      })
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      await expect(
        client.analyzeImages({ inspectionId: 'x', photos: [] })
      ).rejects.toMatchObject({
        source: 'backend',
        message: 'Claude unavailable',
      })
    })
  })
})
