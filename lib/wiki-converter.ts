interface Thread {
  id: string
  title: string
  createdAt: Date
  messages: Array<{
    content: string
    contentType: string
    createdAt: Date
    creator: {
      name: string
      email: string
    }
  }>
}

interface WikiConversionResult {
  title: string
  content: string
  summary: string
  tags: string[]
  category?: string
}

export async function convertThreadToWiki(thread: Thread): Promise<WikiConversionResult> {
  // Extract all messages in chronological order
  const messages = thread.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // 1. Title Generation
  const title = generateWikiTitle(thread, messages)

  // 2. Summary Creation
  const summary = generateSummary(messages)

  // 3. Content Structuring
  const content = structureContent(messages, thread)

  // 4. Tag Extraction
  const tags = extractTags(messages, thread)

  // 5. Category Detection
  const category = detectCategory(messages, thread)

  return {
    title,
    content,
    summary,
    tags,
    category,
  }
}

function generateWikiTitle(thread: Thread, messages: any[]): string {
  // Use thread title if available
  if (thread.title && thread.title.trim()) {
    return thread.title.trim()
  }

  // Auto-generate from first message or topic
  const firstMessage = messages[0]
  if (firstMessage && firstMessage.content) {
    // Extract first 50 characters as title
    const title = firstMessage.content
      .replace(/^[#\s]+/, '') // Remove leading # and spaces
      .split('\n')[0] // Get first line
      .substring(0, 50)
      .trim()

    if (title) {
      return title + (firstMessage.content.length > 50 ? '...' : '')
    }
  }

  // Fallback to date-based title
  const date = new Date(thread.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `Discussion from ${date}`
}

function generateSummary(messages: any[]): string {
  if (messages.length === 0) return ''

  // Extract key themes and action items
  const allContent = messages.map(m => m.content).join(' ')
  const wordCount = allContent.split(' ').length

  // Look for action items
  const actionItemPatterns = [
    /(?:will|should|need to|have to|going to|plan to)\s+\w+/gi,
    /(?:todo|task|action\s*item)/gi,
    /\[ \]/g, // checkbox format
  ]

  const actionItems: string[] = []
  messages.forEach(message => {
    const lines = message.content.split('\n')
    lines.forEach(line => {
      if (actionItemPatterns.some(pattern => pattern.test(line))) {
        actionItems.push(line.trim())
      }
    })
  })

  // Count participants
  const participants = new Set(messages.map(m => m.creator.name)).size
  const messageCount = messages.length

  // Generate summary
  let summary = `A discussion with ${messageCount} messages from ${participants} participant${participants > 1 ? 's' : ''}. `

  if (wordCount < 50) {
    summary += 'Brief conversation.'
  } else if (wordCount < 200) {
    summary += 'Moderately detailed discussion.'
  } else {
    summary += 'Comprehensive discussion with significant detail.'
  }

  if (actionItems.length > 0) {
    summary += ` Contains ${actionItems.length} action item${actionItems.length > 1 ? 's' : ''}.`
  }

  return summary
}

function structureContent(messages: any[], thread: Thread): string {
  const lines: string[] = []

  // Header
  lines.push(`# ${generateWikiTitle(thread, messages)}`)
  lines.push('')
  lines.push('> **Generated from conversation thread**')
  lines.push(`> **Started:** ${new Date(thread.createdAt).toLocaleString()}`)
  lines.push(`> **Messages:** ${messages.length}`)
  lines.push('')

  // Participants
  const participants = Array.from(new Set(messages.map(m => m.creator.name)))
  lines.push('## Participants')
  participants.forEach(name => {
    lines.push(`- ${name}`)
  })
  lines.push('')

  // Messages by topic/theme
  lines.push('## Discussion')
  lines.push('')

  // Group messages chronologically with formatting
  messages.forEach((message, index) => {
    const timestamp = new Date(message.createdAt).toLocaleString()
    const author = message.creator.name

    lines.push(`### ${author} - ${timestamp}`)
    lines.push('')

    // Format the message content
    const formattedContent = formatMessageContent(message.content, message.contentType)
    lines.push(formattedContent)
    lines.push('')

    // Add separator between messages
    if (index < messages.length - 1) {
      lines.push('---')
      lines.push('')
    }
  })

  // Metadata section
  lines.push('## Metadata')
  lines.push('')
  lines.push(`- **Original Thread ID:** ${thread.id}`)
  lines.push(`- **Generated:** ${new Date().toLocaleString()}`)
  lines.push(`- **Message Count:** ${messages.length}`)
  lines.push(`- **Participant Count:** ${participants.length}`)
  lines.push('')

  return lines.join('\n')
}

function formatMessageContent(content: string, contentType: string): string {
  // Handle different content types
  switch (contentType) {
    case 'CODE':
      // Wrap code blocks in markdown code fences
      if (!content.includes('```')) {
        return `\`\`\`\n${content}\n\`\`\``
      }
      return content

    case 'LINK':
      // Format links
      const urlRegex = /(https?:\/\/[^\s]+)/g
      return content.replace(urlRegex, '[$1]($1)')

    case 'IMAGE':
    case 'FILE':
      // For now, just return as text
      return content

    case 'TEXT':
    default:
      // Handle markdown-like formatting in text
      let formatted = content

      // Convert bullet points
      formatted = formatted.replace(/^[\s•-]\s+(.+)$/gm, '- $1')

      // Convert numbered lists
      formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '$1.')

      // Handle @mentions and #hashtags
      formatted = formatted.replace(/@(\w+)/g, '**@$1**')
      formatted = formatted.replace(/#(\w+)/g, '**#$1**')

      return formatted
  }
}

function extractTags(messages: any[], thread: Thread): string[] {
  const tags = new Set<string>()

  // Extract hashtags from messages
  messages.forEach(message => {
    const hashtags = message.content.match(/#(\w+)/gi)
    if (hashtags) {
      hashtags.forEach(tag => tags.add(tag.toLowerCase().replace('#', '')))
    }
  })

  // Extract @mentions as potential tags
  messages.forEach(message => {
    const mentions = message.content.match(/@(\w+)/gi)
    if (mentions) {
      mentions.forEach(mention => tags.add(mention.toLowerCase().replace('@', '')))
    }
  })

  // Extract keywords from thread title
  if (thread.title) {
    const titleWords = thread.title.toLowerCase().split(/\s+/)
    titleWords.forEach(word => {
      if (word.length > 3 && !isStopWord(word)) {
        tags.add(word)
      }
    })
  }

  // Add common categorization tags
  if (messages.length > 10) {
    tags.add('long-discussion')
  } else if (messages.length < 5) {
    tags.add('quick-chat')
  }

  const participants = messages.length
  if (participants > 5) {
    tags.add('group-discussion')
  } else if (participants <= 2) {
    tags.add('one-on-one')
  }

  // Add time-based tags
  const threadDate = new Date(thread.createdAt)
  const now = new Date()
  const daysDiff = (now.getTime() - threadDate.getTime()) / (1000 * 60 * 60 * 24)

  if (daysDiff < 1) {
    tags.add('recent')
  } else if (daysDiff > 30) {
    tags.add('archive')
  }

  return Array.from(tags).slice(0, 10) // Limit to 10 tags
}

function detectCategory(messages: any[], thread: Thread): string | undefined {
  const allContent = messages.map(m => m.content.toLowerCase()).join(' ')
  const title = (thread.title || '').toLowerCase()

  // Technical keywords
  const technicalKeywords = [
    'code', 'function', 'api', 'database', 'bug', 'feature', 'deploy', 'test',
    'server', 'client', 'frontend', 'backend', 'git', 'commit', 'pull request'
  ]

  // Planning keywords
  const planningKeywords = [
    'plan', 'timeline', 'deadline', 'milestone', 'roadmap', 'sprint',
    'goal', 'objective', 'strategy', 'meeting', 'agenda', 'decision'
  ]

  // Support keywords
  const supportKeywords = [
    'help', 'issue', 'problem', 'question', 'support', 'troubleshoot',
    'error', 'fix', 'resolve', 'solution', 'answer'
  ]

  const categories = [
    { name: 'Technical', keywords: technicalKeywords },
    { name: 'Planning', keywords: planningKeywords },
    { name: 'Support', keywords: supportKeywords },
  ]

  let bestMatch: { name: string; score: number } | null = null

  categories.forEach(category => {
    let score = 0
    category.keywords.forEach(keyword => {
      if (allContent.includes(keyword)) score++
      if (title.includes(keyword)) score += 2 // Title has higher weight
    })

    if (score > (bestMatch?.score || 0)) {
      bestMatch = { name: category.name, score }
    }
  })

  return bestMatch?.score > 0 ? bestMatch.name : undefined
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
    'him', 'her', 'us', 'them', 'what', 'which', 'who', 'when', 'where',
    'why', 'how', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will',
    'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must'
  ])

  return stopWords.has(word.toLowerCase())
}