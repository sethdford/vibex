/**
 * Vitest Jest Compatibility Test
 * 
 * Verifies that Jest syntax works correctly with Vitest
 */

describe('Jest Compatibility', () => {
  it('should support jest.fn()', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should support jest.spyOn()', () => {
    const obj = { method: () => 'original' };
    const spy = jest.spyOn(obj, 'method').mockReturnValue('mocked');
    
    expect(obj.method()).toBe('mocked');
    expect(spy).toHaveBeenCalled();
  });

  it('should support jest.mock()', () => {
    // This test verifies the jest global is available
    expect(typeof jest.mock).toBe('function');
    expect(typeof jest.fn).toBe('function');
    expect(typeof jest.clearAllMocks).toBe('function');
  });

  it('should support MockedFunction type compatibility', () => {
    const mockFn = jest.fn() as jest.MockedFunction<() => string>;
    mockFn.mockReturnValue('test');
    
    expect(mockFn()).toBe('test');
    expect(mockFn).toHaveBeenCalled();
  });
}); 