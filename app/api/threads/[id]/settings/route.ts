import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// PUT /api/threads/[id]/settings - Update thread auto-convert settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { autoConvert, convertAfter, convertWhen } = body

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

    // Only thread creator or workspace admins can update settings
    const member = thread.conversation.workspace.members[0]
    if (thread.createdBy !== session.user.id && member.role === "MEMBER" && member.role === "VIEWER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const updateData: any = {
      autoConvert: Boolean(autoConvert),
    }

    if (convertAfter !== undefined && convertAfter !== null) {
      if (convertAfter < 1 || convertAfter > 100) {
        return NextResponse.json({ error: "convertAfter must be between 1 and 100" }, { status: 400 })
      }
      updateData.convertAfter = convertAfter
    }

    if (convertWhen !== undefined && convertWhen !== null) {
      const convertWhenDate = new Date(convertWhen)
      if (isNaN(convertWhenDate.getTime())) {
        return NextResponse.json({ error: "convertWhen must be a valid date" }, { status: 400 })
      }

      // Don't allow setting convertWhen in the past
      if (convertWhenDate <= new Date()) {
        return NextResponse.json({ error: "convertWhen must be in the future" }, { status: 400 })
      }

      updateData.convertWhen = convertWhenDate
    }

    const updatedThread = await prisma.thread.update({
      where: { id: params.id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      thread: {
        id: updatedThread.id,
        title: updatedThread.title,
        autoConvert: updatedThread.autoConvert,
        convertAfter: updatedThread.convertAfter,
        convertWhen: updatedThread.convertWhen,
        updatedAt: updatedThread.updatedAt,
      },
    })
  } catch (error) {
    console.error("Error updating thread settings:", error)
    return NextResponse.json(
      { error: "Failed to update thread settings" },
      { status: 500 }
    )
  }
}