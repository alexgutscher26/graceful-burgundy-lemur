import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/conversations - Get conversations for current workspace
/**
 * Fetch conversations for a specific workspace.
 *
 * This function retrieves the user's session and checks for authorization. It validates the presence of a workspace ID and verifies the user's access to that workspace. If authorized, it fetches the conversations associated with the workspace, including message and thread counts, and formats the results before returning them. In case of errors, appropriate responses are returned based on the failure point.
 *
 * @param request - The NextRequest object containing the request details.
 * @returns A JSON response containing the success status and the list of formatted conversations.
 * @throws Error If an error occurs during the fetching process.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
    }

    // Check if user has access to this workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
      },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId,
      },
      include: {
        _count: {
          select: {

            threads: true,
          },
        },
        threads: {
          take: 1,
          orderBy: {
            updatedAt: "desc",
          },
          include: {
            messages: {
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || "Untitled Conversation",
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: 0,
      threadCount: conv._count.threads,
      lastActivity: conv.threads[0]?.messages[0]?.createdAt || conv.createdAt,
    }))

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
    })
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create new conversation
/**
 * Handles the creation of a new conversation within a specified workspace.
 *
 * This function first authenticates the user and checks for their access to the specified workspace.
 * It then validates the request body for the required workspaceId and creates a new conversation
 * if all conditions are met. In case of any errors, appropriate JSON responses are returned.
 *
 * @param request - The NextRequest object containing the request data.
 * @returns A JSON response indicating success or failure, along with the created conversation details if successful.
 * @throws Error If an error occurs during the conversation creation process.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, title } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
    }

    // Check if user has access to this workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
      },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        title: title || null,
      },
      include: {
        _count: {
          select: {

            threads: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title || "Untitled Conversation",
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: 0,
        threadCount: conversation._count.threads,
      },
    })
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    )
  }
}