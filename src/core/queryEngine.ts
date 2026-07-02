import { StreamEvent } from './eventBuffer';

// The kinds of tokens a query can contain
type QueryTokenType = 'KEY_VALUE' | 'WILDCARD' | 'NEGATION' | 'TEXT';

// A single parsed token from the query string
interface QueryToken {
  type: QueryTokenType;
  key?: string;
  value: string;
  negate: boolean;
}

/**
 * Case-insensitive containment check
 */
function containsIgnoreCase(text: string, search: string): boolean {
  return text.toLowerCase().includes(search.toLowerCase());
}

/**
 * Tokenize a query string into structured tokens
 * Supports:
 * - key:"value" (exact match)
 * - key:*value* (wildcard/contains)
 * - -key:value (negation)
 * - "value" (plain text search)
 * - "value1" "value2" (multiple text search)
 */
export function tokenizeQuery(query: string): QueryToken[] {
  if (!query.trim()) {
    return [];
  }

  const tokens: QueryToken[] = [];
  let cursor = 0;
  const queryLength = query.length;

  while (cursor < queryLength) {
    // Skip whitespace
    while (cursor < queryLength && query[cursor] === ' ') {
      cursor++;
    }

    if (cursor >= queryLength) {
      break;
    }

    // Check if this token is negated
    const isNegation = query[cursor] === '-';
    if (isNegation) {
      cursor++;
    }

    // Decide between key:value token and plain text token
    let colonPosition = -1;
    const keyStart = cursor;

    // Look for a colon that's not inside quotes
    let insideQuotes = false;
    for (let i = cursor; i < queryLength; i++) {
      if (query[i] === '"') {
        insideQuotes = !insideQuotes;
      } else if (query[i] === ':' && !insideQuotes) {
        colonPosition = i;
        break;
      } else if (query[i] === ' ' && !insideQuotes) {
        break;
      }
    }

    if (colonPosition > -1) {
      // key:value token
      const key = query.substring(keyStart, colonPosition).trim();
      cursor = colonPosition + 1;

      // Extract the value (which might be quoted)
      let value = '';
      let isWildcard = false;

      if (cursor < queryLength && query[cursor] === '"') {
        // Quoted value
        cursor++; // Skip opening quote
        const valueStart = cursor;

        while (cursor < queryLength && query[cursor] !== '"') {
          cursor++;
        }

        value = query.substring(valueStart, cursor);

        if (cursor < queryLength) {
          cursor++; // Skip closing quote
        }
      } else if (cursor < queryLength && query[cursor] === '*') {
        // Wildcard value
        isWildcard = true;
        cursor++; // Skip opening asterisk
        const valueStart = cursor;

        while (
          cursor < queryLength &&
          query[cursor] !== ' ' &&
          query[cursor] !== '*'
        ) {
          cursor++;
        }

        value = query.substring(valueStart, cursor);

        if (cursor < queryLength && query[cursor] === '*') {
          cursor++; // Skip closing asterisk
        } else {
          // No closing asterisk: treat as prefix search
          isWildcard = false;
          value = query.substring(valueStart - 1, cursor);
        }
      } else {
        // Bare value until space or end
        const valueStart = cursor;

        while (cursor < queryLength && query[cursor] !== ' ') {
          cursor++;
        }

        value = query.substring(valueStart, cursor);
      }

      tokens.push({
        type: isWildcard ? 'WILDCARD' : 'KEY_VALUE',
        key,
        value,
        negate: isNegation,
      });
    } else {
      // Plain text token
      let value = '';

      if (cursor < queryLength && query[cursor] === '"') {
        // Quoted text
        cursor++; // Skip opening quote
        const valueStart = cursor;

        while (cursor < queryLength && query[cursor] !== '"') {
          cursor++;
        }

        value = query.substring(valueStart, cursor);

        if (cursor < queryLength) {
          cursor++; // Skip closing quote
        }
      } else {
        // Bare text until space or end
        const valueStart = cursor;

        while (cursor < queryLength && query[cursor] !== ' ') {
          cursor++;
        }

        value = query.substring(valueStart, cursor);
      }

      tokens.push({
        type: 'TEXT',
        value,
        negate: isNegation,
      });
    }
  }

  return tokens;
}

/**
 * Filter events against a list of parsed query tokens
 */
export function applyQueryTokens(
  events: StreamEvent[],
  tokens: QueryToken[],
): StreamEvent[] {
  if (tokens.length === 0) {
    return events;
  }

  return events.filter((event) => {
    // Every token must match for the event to be included
    for (const token of tokens) {
      let matches = false;

      if (token.type === 'KEY_VALUE' && token.key) {
        // Exact match on a specific field
        const fieldValue = event[token.key];
        if (fieldValue !== undefined) {
          const fieldValueStr = String(fieldValue).toLowerCase();
          const tokenValueLower = token.value.toLowerCase();
          matches = fieldValueStr === tokenValueLower;
        }
      } else if (token.type === 'WILDCARD' && token.key) {
        // Containment match on a specific field
        const fieldValue = event[token.key];
        if (fieldValue !== undefined) {
          const fieldValueStr = String(fieldValue).toLowerCase();
          const tokenValueLower = token.value.toLowerCase();
          matches = fieldValueStr.includes(tokenValueLower);
        }
      } else if (token.type === 'TEXT') {
        // Containment match across every field
        const tokenValue = token.value;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [key, value] of Object.entries(event)) {
          if (typeof value === 'string') {
            if (containsIgnoreCase(value, tokenValue)) {
              matches = true;
              break;
            }
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            // Numbers and booleans compare as strings
            if (String(value).toLowerCase() === tokenValue.toLowerCase()) {
              matches = true;
              break;
            }
          } else if (typeof value === 'object' && value !== null) {
            // Objects compare against their stringified form
            try {
              const stringValue = JSON.stringify(value);
              if (containsIgnoreCase(stringValue, tokenValue)) {
                matches = true;
                break;
              }
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
              // Ignore stringify errors
            }
          }
        }
      }

      // Negated tokens invert their match
      if (token.negate) {
        matches = !matches;
      }

      if (!matches) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Convenience wrapper: tokenize and apply in one step
 */
export function runQuery(
  events: StreamEvent[],
  query: string,
): StreamEvent[] {
  if (!query.trim()) {
    return events;
  }

  const tokens = tokenizeQuery(query);
  return applyQueryTokens(events, tokens);
}
