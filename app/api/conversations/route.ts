import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/conversations - Get conversations for current workspace
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
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
            messages: true,
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
      messageCount: conv._count.messages,
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
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
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
            messages: true,
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
        messageCount: conversation._count.messages,
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