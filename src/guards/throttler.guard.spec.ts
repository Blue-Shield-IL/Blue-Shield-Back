import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { CustomThrottlerGuard } from './throttler.guard';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;

  beforeEach(() => {
    // Create instance with minimal dependencies (we only test throwThrottlingException)
    guard = Object.create(CustomThrottlerGuard.prototype);
  });

  describe('throwThrottlingException', () => {
    it('should throw HttpException with 429 status and retry-after info', async () => {
      const mockHeader = jest.fn();
      const mockResponse = { header: mockHeader };
      const mockContext = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;

      const throttlerLimitDetail = { ttl: 900000 }; // 15 minutes in ms

      await expect(
        (guard as any).throwThrottlingException(mockContext, throttlerLimitDetail),
      ).rejects.toThrow(HttpException);

      try {
        await (guard as any).throwThrottlingException(mockContext, throttlerLimitDetail);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

        const response = (error as HttpException).getResponse() as any;
        expect(response.statusCode).toBe(429);
        expect(response.message).toBe('Too many attempts');
        expect(response.retryAfter).toBe(900);
      }

      expect(mockHeader).toHaveBeenCalledWith('Retry-After', '900');
    });

    it('should ceil the ttl seconds value', async () => {
      const mockHeader = jest.fn();
      const mockResponse = { header: mockHeader };
      const mockContext = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;

      const throttlerLimitDetail = { ttl: 1500 }; // 1.5 seconds

      try {
        await (guard as any).throwThrottlingException(mockContext, throttlerLimitDetail);
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.retryAfter).toBe(2); // ceil(1.5) = 2
      }

      expect(mockHeader).toHaveBeenCalledWith('Retry-After', '2');
    });
  });
});
