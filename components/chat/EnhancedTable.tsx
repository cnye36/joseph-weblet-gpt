"use client";

import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartModal from "./ChartModal";

interface EnhancedTableProps {
  headers: string[];
  rows: string[][];
  className?: string;
}

export default function EnhancedTable({ headers, rows, className = "" }: EnhancedTableProps) {
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnIndex);
      setSortDirection("asc");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (sortColumn === null) return 0;

    const aVal = a[sortColumn] || "";
    const bVal = b[sortColumn] || "";

    // Try numeric comparison first
    const aNum = parseFloat(aVal);
    const bNum = parseFloat(bVal);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Fallback to string comparison
    return sortDirection === "asc"
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });

  const SortIcon = ({ columnIndex }: { columnIndex: number }) => {
    if (sortColumn !== columnIndex) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1" />
    );
  };

  const downloadCSV = () => {
    const csvContent = [
      headers.join(","),
      ...sortedRows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "table-data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const TableContent = () => (
    <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-muted/70 transition-colors select-none"
                onClick={() => handleSort(idx)}
              >
                <div className="flex items-center">
                  <span>{header}</span>
                  <SortIcon columnIndex={idx} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
  );

  return (
    <>
      <div className={`relative group my-4 overflow-x-auto rounded-lg border ${className}`}>
        <TableContent />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-background/80 backdrop-blur-sm rounded p-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 gap-1"
          >
            <Expand className="h-3 w-3" />
            Enlarge
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadCSV}
            className="h-8 gap-1"
          >
            <Download className="h-3 w-3" />
            CSV
          </Button>
        </div>
      </div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Table Data"
        onDownload={downloadCSV}
      >
        <div className="overflow-x-auto">
          <TableContent />
        </div>
      </ChartModal>
    </>
  );
}

