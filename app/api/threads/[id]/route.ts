import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/threads/[id] - Get thread details with messages
/**
 * Fetch a thread and its associated data based on the provided request and parameters.
 *
 * The function first authenticates the user session. If the user is not authenticated, it returns an unauthorized error.
 * It then retrieves the thread from the database, including its conversation, creator, messages, and wiki page.
 * If the thread is not found or the user has no access to the workspace, a not found error is returned.
 * Finally, it formats the messages and returns the thread data in a structured JSON response.
 *
 * @param request - The NextRequest object containing the request details.
 * @param params - An object containing the parameters, specifically the thread ID.
 * @returns A JSON response containing the thread data or an error message.
 * @throws Error If there is an issue fetching the thread from the database.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const thread = await prisma.thread.findUnique({
      where: { id: params.id },
      include: {
        conversation: {
          include: {
            workspace: {
              include: {
                members: {
                  where: {
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        messages: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            replyTo: {
              include: {
                creator: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        wikiPage: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!thread || thread.conversation.workspace.members.length === 0) {
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 })
    }

    const formattedMessages = thread.messages.map((message) => ({
      id: message.id,
      content: message.content,
      contentType: message.contentType,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      editedAt: message.editedAt,
      replyToId: message.replyToId,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        createdAt: message.replyTo.createdAt,
        createdBy: message.replyTo.creator,
      } : null,
      createdBy: message.creator,
    }))

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        isDocumented: thread.isDocumented,
        autoConvert: thread.autoConvert,
        convertAfter: thread.convertAfter,
        convertWhen: thread.convertWhen,
        createdBy: thread.creator,
        conversation: {
          id: thread.conversation.id,
          title: thread.conversation.title || "Untitled Conversation",
        },
        wikiPage: thread.wikiPage ? {
          id: thread.wikiPage.id,
          title: thread.wikiPage.title,
          summary: thread.wikiPage.summary,
          tags: thread.wikiPage.tags,
          category: thread.wikiPage.category,
          isPublic: thread.wikiPage.isPublic,
          createdAt: thread.wikiPage.createdAt,
          updatedAt: thread.wikiPage.updatedAt,
          createdBy: thread.wikiPage.creator,
        } : null,
        messages: formattedMessages,
      },
    })
  } catch (error) {
    console.error("Error fetching thread:", error)
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    )
  }
}