import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { convertThreadToWiki } from "@/lib/wiki-converter"
import { NextRequest, NextResponse } from "next/server"

// POST /api/threads/[id]/convert-to-wiki - Manual conversion to wiki page
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
        messages: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!thread || thread.conversation.workspace.members.length === 0) {
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 })
    }

    // Check if wiki page already exists
    const existingWikiPage = await prisma.wikiPage.findUnique({
      where: { threadId: params.id },
    })

    if (existingWikiPage) {
      return NextResponse.json({ error: "Wiki page already exists for this thread" }, { status: 409 })
    }

    // Convert thread content to wiki page
    const threadForConversion = {
      ...thread,
      messages: thread.messages.map(msg => ({
        ...msg,
        creator: {
          ...msg.creator,
          name: msg.creator.name || "Unknown User"
        }
      }))
    }
    const wikiContent = await convertThreadToWiki(threadForConversion)

    // Create wiki page
    const wikiPage = await prisma.wikiPage.create({
      data: {
        threadId: params.id,
        title: wikiContent.title,
        content: wikiContent.content,
        summary: wikiContent.summary,
        tags: wikiContent.tags,
        category: wikiContent.category,
        isPublic: false, // Default to private
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
      },
    })

    // Update thread to mark as documented
    await prisma.thread.update({
      where: { id: params.id },
      data: { isDocumented: true },
    })

    // TODO: Emit real-time event for WebSocket
    // WebSocket emission would happen here

    return NextResponse.json({
      success: true,
      wikiPage: {
        id: wikiPage.id,
        title: wikiPage.title,
        content: wikiPage.content,
        summary: wikiPage.summary,
        tags: wikiPage.tags,
        category: wikiPage.category,
        isPublic: wikiPage.isPublic,
        createdAt: wikiPage.createdAt,
        updatedAt: wikiPage.updatedAt,
        createdBy: wikiPage.creator,
        threadId: wikiPage.threadId,
      },
    })
  } catch (error) {
    console.error("Error converting thread to wiki:", error)
    return NextResponse.json(
      { error: "Failed to convert thread to wiki" },
      { status: 500 }
    )
  }
}