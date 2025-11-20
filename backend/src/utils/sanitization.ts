import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize user-generated content to prevent XSS attacks
 *
 * This function strips ALL HTML tags and attributes from input strings,
 * leaving only plain text. This prevents stored XSS vulnerabilities.
 *
 * @param content - The user input to sanitize (can be string, null, or undefined)
 * @returns Sanitized plain text string (empty string for null/undefined inputs)
 *
 * @example
 * sanitizeUserContent('<script>alert("XSS")</script>Hello')
 * // Returns: 'Hello'
 *
 * sanitizeUserContent('<img src=x onerror=alert(1)>Text')
 * // Returns: 'Text'
 *
 * sanitizeUserContent('Normal text')
 * // Returns: 'Normal text'
 */
export function sanitizeUserContent(content: string | null | undefined): string {
  // Handle null/undefined inputs
  if (content === null || content === undefined) {
    return '';
  }

  // Handle empty strings
  if (content === '') {
    return '';
  }

  // Configure sanitize-html to strip ALL HTML tags and attributes
  // This is the most secure approach - we don't allow any HTML in user content
  const sanitized = sanitizeHtml(content, {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {}, // Strip all attributes
    disallowedTagsMode: 'discard', // Remove tags but keep text content
  });

  return sanitized;
}
