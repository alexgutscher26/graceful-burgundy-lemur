import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST /api/threads/[id]/messages - Send message to thread
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
    const { content, contentType, replyToId } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    // Verify the thread exists and user has access
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
      },
    })

    if (!thread || thread.conversation.workspace.members.length === 0) {
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 })
    }

    // If replyToId is provided, verify it exists in the same thread
    if (replyToId) {
      const replyToMessage = await prisma.message.findUnique({
        where: { id: replyToId },
      })

      if (!replyToMessage || replyToMessage.threadId !== params.id) {
        return NextResponse.json({ error: "Invalid reply target" }, { status: 400 })
      }
    }

    const message = await prisma.message.create({
      data: {
        threadId: params.id,
        content: content.trim(),
        contentType: contentType || "TEXT",
        replyToId: replyToId || null,
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
    })

    // Update thread's updatedAt timestamp
    await prisma.thread.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        contentType: message.contentType,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        replyToId: message.replyToId,
        replyTo: message.replyTo ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          createdAt: message.replyTo.createdAt,
          createdBy: message.replyTo.creator,
        } : null,
        createdBy: message.creator,
      },
    })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    )
  }
}