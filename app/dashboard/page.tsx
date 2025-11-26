import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ConversationDashboard } from "@/components/conversations/ConversationDashboard"

async function getWorkspaceData() {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }

  // Get user's default workspace or first workspace
  const userWithWorkspaces = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      defaultWorkspace: true,
      workspaces: {
        include: {
          workspace: true,
        },
      },
    },
  })

  if (!userWithWorkspaces) {
    return null
  }

  const workspace = userWithWorkspaces.defaultWorkspace ||
    userWithWorkspaces.workspaces[0]?.workspace

  if (!workspace) {
    return null
  }

  // Create a default conversation if none exists
  let conversation = await prisma.conversation.findFirst({
    where: { workspaceId: workspace.id },
    include: {
      _count: {
        select: {
          messages: true,
          threads: true,
        },
      },
    },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: "General Discussion",
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
  }

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    conversation: {
      id: conversation.id,
      title: conversation.title || "General Discussion",
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: conversation._count.messages,
      threadCount: conversation._count.threads,
      lastActivity: conversation.updatedAt.toISOString(),
    },
    user: {
      id: session.user.id,
      name: session.user.name || "User",
      email: session.user.email || "",
      image: session.user.image,
    },
  }
}

export default async function Home() {
  const data = await getWorkspaceData()

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to Your Workspace</h1>
          <p className="text-muted-foreground">Please set up your workspace to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <ConversationDashboard
        workspaceId={data.workspaceId}
        initialConversation={data.conversation}
      />
    </div>
  )
}
