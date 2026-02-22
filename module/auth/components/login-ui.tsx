"use client"

import { signIn } from "@/lib/auth-client"
import { Github } from "lucide-react"
import { useState } from "react"

const LoginUI = () => {
  const [isLoading, setLoading] = useState(false)

  const handleGithubLogin = async () => {
    setLoading(true)
    try {
      await signIn.social({ provider: "github" })
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-black to-zinc-900 text-white flex">

      {/* LEFT SECTION */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 py-16">
        <div className="max-w-lg">

          <div className="mb-16">
            <div className="inline-flex items-center gap-2 text-2xl font-bold">
              <div className="w-8 h-8 bg-orange-500 rounded-full" />
              <span>BugLens</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Cut Code Review Time & Bugs in Half.
            <span className="block">Instantly.</span>
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed">
            Supercharge your team to ship faster with the most advanced AI code reviews.
          </p>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex-1 flex flex-col justify-center items-center px-12 py-16">
        <div className="w-full max-w-sm">

          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
            <p className="text-gray-400">
              Login using one of the following providers:
            </p>
          </div>

          <button
            onClick={handleGithubLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-white text-black rounded-lg font-semibold 
            hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors flex items-center justify-center gap-3 mb-8"
          >
            <Github size={20} />
            {isLoading ? "Signing in..." : "GitHub"}
          </button>

          <div className="space-y-4 text-center text-sm text-gray-400">

            <div>
              New to BugLens?{" "}
              <a
                href="#"
                className="text-orange-500 hover:text-orange-400 font-semibold"
              >
                Sign Up
              </a>
            </div>

            <div>
              <a
                href="#"
                className="text-orange-500 hover:text-orange-400 font-semibold"
              >
                Self-Hosted Services
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700 flex justify-center gap-2 text-xs text-gray-500">
            <a href="#" className="hover:text-gray-400">
              Terms of Use
            </a>
            <span>and</span>
            <a href="#" className="hover:text-gray-400">
              Privacy Policy
            </a>
          </div>

        </div>
      </div>

    </div>
  )
}

export default LoginUI