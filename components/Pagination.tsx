import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams }: PaginationProps) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (key !== 'page' && typeof value === 'string') {
          params.set(key, value);
        }
      });
    }
    params.set('page', page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const showMax = 5; // Max number of page buttons to show
    
    // Always include first, last, current, and neighbors
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            pages.push(i);
        }
    }
    
    // Sort and remove duplicates
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
        className="h-8 w-8"
      >
        {currentPage > 1 ? (
          <Link href={createPageUrl(1)} aria-label="First page">
            <ChevronsLeft className="h-4 w-4" />
          </Link>
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
        className="h-8 w-8"
      >
        {currentPage > 1 ? (
          <Link href={createPageUrl(currentPage - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="flex items-center gap-1 mx-2">
        {pageNumbers.map((p, i) => {
          const prev = pageNumbers[i - 1];
          const showEllipsis = prev && p - prev > 1;

          return (
            <div key={p} className="flex items-center gap-1">
              {showEllipsis && <span className="text-neutral-400 px-1">...</span>}
              <Button
                variant={p === currentPage ? "default" : "outline"}
                size="sm"
                asChild={p !== currentPage}
                className={`h-8 w-8 p-0 ${p === currentPage ? "pointer-events-none bg-neutral-900 text-white hover:bg-neutral-800" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                {p === currentPage ? (
                  <span>{p}</span>
                ) : (
                  <Link href={createPageUrl(p)}>
                    {p}
                  </Link>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
        className="h-8 w-8"
      >
        {currentPage < totalPages ? (
          <Link href={createPageUrl(currentPage + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
        className="h-8 w-8"
      >
        {currentPage < totalPages ? (
          <Link href={createPageUrl(totalPages)} aria-label="Last page">
            <ChevronsRight className="h-4 w-4" />
          </Link>
        ) : (
          <ChevronsRight className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
