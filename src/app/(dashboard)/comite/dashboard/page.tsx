"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import StudentDashboard from "@/components/student/StudentDashboard";
import CommitteeExtraFeatures from "@/components/committee/CommitteeExtraFeatures";
import { shouldForceReauth } from "@/lib/authUtils";

export default function CommitteeDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if forced re-authentication is required
    if (shouldForceReauth()) {
      router.push("/login");
      return;
    }

    // Check authentication
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Check role when session is loaded
    if (status === "authenticated") {
      if (session?.user?.role === "student") {
        // Redirect students to their dashboard
        router.push("/etudiant/dashboard");
        return;
      }
      if (session?.user?.role !== "committee") {
        setIsAuthorized(false);
        return;
      }
      setIsAuthorized(true);
    }
  }, [session, status, router]);

  // Show loading state while checking authentication
  if (status === "loading" || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show unauthorized message if not a committee member
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 max-w-md w-full">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Accès non autorisé. Cette page est réservée aux membres du comité.
              </p>
            </div>
          </div>
        </div>
        <Link href="/" className="text-[#0b2b5c] hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  // Render student dashboard with committee extras
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Committee Extra Features at the top */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <CommitteeExtraFeatures />
      </div>
      
      {/* Standard Student Dashboard (since committee members are also students) */}
      <div className="border-t border-gray-200 pt-4">
        <StudentDashboard user={session!.user} />
      </div>
    </div>
  );
}