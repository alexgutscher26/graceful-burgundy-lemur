import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/wiki - Get all wiki pages for workspace
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const search = searchParams.get("search")
    const tags = searchParams.get("tags")?.split(",").filter(Boolean)
    const category = searchParams.get("category")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

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

    // Build where clause
    const whereClause: any = {
      thread: {
        conversation: {
          workspaceId: workspaceId,
        },
      },
    }

    if (search) {
      whereClause.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          content: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          summary: {
            contains: search,
            mode: "insensitive",
          },
        },
      ]
    }

    if (tags && tags.length > 0) {
      whereClause.tags = {
        hasSome: tags,
      }
    }

    if (category) {
      whereClause.category = {
        contains: category,
        mode: "insensitive",
      }
    }

    const wikiPages = await prisma.wikiPage.findMany({
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
        thread: {
          include: {
            conversation: {
              select: {
                id: true,
                title: true,
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

    const formattedWikiPages = wikiPages.map((wiki) => ({
      id: wiki.id,
      title: wiki.title,
      summary: wiki.summary,
      tags: wiki.tags,
      category: wiki.category,
      isPublic: wiki.isPublic,
      createdAt: wiki.createdAt,
      updatedAt: wiki.updatedAt,
      createdBy: wiki.creator,
      threadId: wiki.threadId,
      conversation: wiki.thread.conversation,
    }))

    return NextResponse.json({
      success: true,
      wikiPages: formattedWikiPages,
    })
  } catch (error) {
    console.error("Error fetching wiki pages:", error)
    return NextResponse.json(
      { error: "Failed to fetch wiki pages" },
      { status: 500 }
    )
  }
}