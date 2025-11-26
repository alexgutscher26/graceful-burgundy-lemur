import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/wiki/[id] - Get specific wiki page
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

    const wikiPage = await prisma.wikiPage.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        thread: {
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
        },
      },
    })

    if (!wikiPage || wikiPage.thread.conversation.workspace.members.length === 0) {
      return NextResponse.json({ error: "Wiki page not found or access denied" }, { status: 404 })
    }

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
        conversation: {
          id: wikiPage.thread.conversation.id,
          title: wikiPage.thread.conversation.title || "Untitled Conversation",
        },
      },
    })
  } catch (error) {
    console.error("Error fetching wiki page:", error)
    return NextResponse.json(
      { error: "Failed to fetch wiki page" },
      { status: 500 }
    )
  }
}

// PUT /api/wiki/[id] - Update wiki page content
export async function PUT(
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
    const { title, content, summary, tags, category, isPublic } = body

    // Get the wiki page with access checks
    const wikiPage = await prisma.wikiPage.findUnique({
      where: { id: params.id },
      include: {
        thread: {
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
        },
      },
    })

    if (!wikiPage || wikiPage.thread.conversation.workspace.members.length === 0) {
      return NextResponse.json({ error: "Wiki page not found or access denied" }, { status: 404 })
    }

    // Check permissions: only creator or workspace admin can edit
    const member = wikiPage.thread.conversation.workspace.members[0]
    const canEdit = wikiPage.createdBy === session.user.id ||
      member.role === "OWNER" ||
      member.role === "ADMIN"

    if (!canEdit) {
      return NextResponse.json({ error: "Insufficient permissions to edit wiki page" }, { status: 403 })
    }

    const updateData: any = {}

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
      }
      updateData.title = title.trim()
    }

    if (content !== undefined) {
      if (!content || content.trim().length === 0) {
        return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 })
      }
      updateData.content = content.trim()
    }

    if (summary !== undefined) {
      updateData.summary = summary ? summary.trim() : null
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: "Tags must be an array" }, { status: 400 })
      }
      updateData.tags = tags.filter(tag => typeof tag === "string" && tag.trim().length > 0)
    }

    if (category !== undefined) {
      updateData.category = category ? category.trim() : null
    }

    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic)
    }

    const updatedWikiPage = await prisma.wikiPage.update({
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
      wikiPage: {
        id: updatedWikiPage.id,
        title: updatedWikiPage.title,
        content: updatedWikiPage.content,
        summary: updatedWikiPage.summary,
        tags: updatedWikiPage.tags,
        category: updatedWikiPage.category,
        isPublic: updatedWikiPage.isPublic,
        createdAt: updatedWikiPage.createdAt,
        updatedAt: updatedWikiPage.updatedAt,
        createdBy: updatedWikiPage.creator,
        threadId: updatedWikiPage.threadId,
      },
    })
  } catch (error) {
    console.error("Error updating wiki page:", error)
    return NextResponse.json(
      { error: "Failed to update wiki page" },
      { status: 500 }
    )
  }
}