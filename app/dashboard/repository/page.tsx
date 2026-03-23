"use client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Search } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRepositories } from '@/module/repository/hooks/use-repositories';

interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
  topics: string[]
  isConnected?: boolean
}

const RepositoryPage = () => {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useRepositories()

  const [localConnectingId, setLocalConnectingId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const allRepositories = data?.pages.flatMap(page => page) || []

  const filteredRepositories = allRepositories.filter((repo: Repository) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConnect = async (repo: any) => {
    setLocalConnectingId(repo.id)
    // your connect logic here
    setLocalConnectingId(null)
  }

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    // Kick off more loading when the user scrolls near the bottom.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (!hasNextPage) return
        if (isFetchingNextPage) return
        fetchNextPage()
      },
      {
        root: null,
        // Start fetching a bit before reaching the bottom.
        rootMargin: "300px",
        threshold: 0,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const RepoCardSkeleton = () => {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-[80%]" />
            </div>

            <div className="flex gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground">
          Manage and view all your GitHub repositories
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {isError && (
          <div className="text-sm text-destructive">
            Failed to load repositories.
          </div>
        )}
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => <RepoCardSkeleton key={i} />)
        ) : (
          filteredRepositories.map((repo: any) => (
            <Card key={repo.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{repo.name}</CardTitle>
                      <Badge variant="outline">{repo.language || "Unknown"}</Badge>
                      {repo.isConnected && <Badge variant="secondary">Connected</Badge>}
                    </div>
                    <CardDescription>{repo.description}</CardDescription>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>

                    <Button
                      onClick={() => handleConnect(repo)}
                      disabled={localConnectingId === repo.id || repo.isConnected}
                      variant={repo.isConnected ? "outline" : "default"}
                    >
                      {localConnectingId === repo.id
                        ? "Connecting..."
                        : repo.isConnected
                        ? "Connected"
                        : "Connect"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {isFetchingNextPage && (
        <div className="grid gap-4">
          {Array.from({ length: 10 }).map((_, i) => <RepoCardSkeleton key={`next-${i}`} />)}
        </div>
      )}

      {/* IntersectionObserver sentinel for infinite scrolling */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />
    </div>
  )
}

export default RepositoryPage