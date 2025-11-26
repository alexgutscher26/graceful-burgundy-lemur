import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/conversations/[id]/threads - Get threads within a conversation
/**
 * Handles the GET request to fetch threads for a specific conversation.
 *
 * This function retrieves the session from the request headers and checks for user authorization.
 * It then validates the existence of the conversation and the user's access to it.
 * Based on search parameters, it constructs a query to fetch threads, formats the results,
 * and returns them in a JSON response. If any errors occur during the process,
 * it logs the error and returns a failure response.
 *
 * @param request - The NextRequest object containing the request details.
 * @param props - An object containing parameters for the request.
 * @param props.params - A promise that resolves to an object with the conversation ID.
 * @returns A JSON response containing the success status and the formatted threads.
 * @throws Error If there is an issue fetching threads or if the user is unauthorized.
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const isDocumented = searchParams.get("isDocumented")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // First, verify the conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
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
    })

    if (!conversation || conversation.workspace.members.length === 0) {
      return NextResponse.json({ error: "Conversation not found or access denied" }, { status: 404 })
    }

    // Build where clause
    const whereClause: any = {
      conversationId: params.id,
    }

    if (search) {
      whereClause.title = {
        contains: search,
        mode: "insensitive",
      }
    }

    if (isDocumented !== null) {
      whereClause.isDocumented = isDocumented === "true"
    }

    const threads = await prisma.thread.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      skip: offset,
    })

    const formattedThreads = threads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      isDocumented: thread.isDocumented,
      autoConvert: thread.autoConvert,
      messageCount: thread._count.messages,
      createdBy: thread.creator,
      lastMessage: thread.messages[0] ? {
        id: thread.messages[0].id,
        content: thread.messages[0].content,
        createdAt: thread.messages[0].createdAt,
        createdBy: thread.messages[0].creator,
      } : null,
    }))

    return NextResponse.json({
      success: true,
      threads: formattedThreads,
    })
  } catch (error) {
    console.error("Error fetching threads:", error)
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    )
  }
}

// POST /api/conversations/[id]/threads - Create new thread in conversation
/**
 * Handles the creation of a new thread in a conversation.
 *
 * This function first retrieves the session to ensure the user is authenticated. It then validates the input data, including the thread title and optional parent thread ID. The function checks for the existence of the conversation and verifies user access. If all validations pass, it creates a new thread and returns the thread details. In case of errors, appropriate responses are returned based on the failure point.
 *
 * @param request - The NextRequest object containing the request data.
 * @param props - An object containing parameters, specifically a Promise that resolves to an object with an id string.
 * @returns A JSON response containing the success status and the created thread details.
 * @throws Error If there is an issue during thread creation or validation.
 */
export async function POST(
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

    const body = await request.json()
    const { title, parentId } = body

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Thread title is required" }, { status: 400 })
    }

    // Verify the conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
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
    })

    if (!conversation || conversation.workspace.members.length === 0) {
      return NextResponse.json({ error: "Conversation not found or access denied" }, { status: 404 })
    }

    // If parentId is provided, verify it exists and belongs to the same conversation
    if (parentId) {
      const parentThread = await prisma.thread.findUnique({
        where: { id: parentId },
      })

      if (!parentThread || parentThread.conversationId !== params.id) {
        return NextResponse.json({ error: "Invalid parent thread" }, { status: 400 })
      }
    }

    const thread = await prisma.thread.create({
      data: {
        conversationId: params.id,
        title: title.trim(),
        parentId: parentId || null,
        createdBy: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        isDocumented: thread.isDocumented,
        autoConvert: thread.autoConvert,
        messageCount: thread._count.messages,
        createdBy: thread.creator,
      },
    })
  } catch (error) {
    console.error("Error creating thread:", error)
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    )
  }
}