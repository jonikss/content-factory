"use client";

import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { StatusBadge } from "@shared/ui";
import type { Article } from "@shared/api";

const col = createColumnHelper<Article>();

const columns = [
  col.accessor("title", {
    header: "Статья",
    cell: (info) => (
      <div className="min-w-0">
        <div className="text-xs truncate">
          {info.getValue() ?? "Без заголовка"}
        </div>
        <div className="text-[10px] text-text3 font-mono mt-0.5 truncate">
          {info.row.original.keyword_text}
        </div>
      </div>
    ),
  }),
  col.accessor("status", {
    header: "Статус",
    cell: (info) => <StatusBadge status={info.getValue()} />,
    size: 90,
  }),
  col.accessor("quality_score", {
    header: "Score",
    cell: (info) => {
      const score = info.getValue();
      if (score == null)
        return <span className="text-text3 font-mono text-xs">—</span>;
      const color =
        score >= 75 ? "text-green" : score >= 50 ? "text-amber" : "text-red";
      return <span className={`font-mono text-xs ${color}`}>{score}</span>;
    },
    size: 70,
  }),
  col.accessor("created_at", {
    header: "Время",
    cell: (info) => {
      const date = new Date(info.getValue());
      return (
        <span className="text-[10px] text-text3 font-mono">
          {date.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      );
    },
    size: 70,
  }),
];

interface ArticlesTableProps {
  data: Article[];
  statusFilter?: string;
}

export function ArticlesTable({ data, statusFilter }: ArticlesTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredData = statusFilter
    ? data.filter((a) => a.status === statusFilter)
    : data;

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="bg-bg2 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_90px_70px_70px] gap-2 px-3.5 py-2 border-b border-border text-[10px] font-medium text-text3 uppercase tracking-wider">
        {table.getHeaderGroups().map((hg) =>
          hg.headers.map((header) => (
            <div
              key={header.id}
              className="cursor-pointer select-none"
              onClick={header.column.getToggleSortingHandler()}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
            </div>
          )),
        )}
      </div>

      {/* Rows */}
      {table.getRowModel().rows.map((row) => (
        <div
          key={row.id}
          className={`grid grid-cols-[1fr_90px_70px_70px] gap-2 px-3.5 py-2.5 border-b border-border items-center cursor-pointer transition-colors hover:bg-bg3 ${
            row.original.status === "rejected" ? "opacity-50" : ""
          }`}
          onClick={() => {
            if (row.original.status !== "generating") {
              router.push(`/articles/${row.original.id}`);
            }
          }}
        >
          {row.getVisibleCells().map((cell) => (
            <div key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ))}
        </div>
      ))}

      {filteredData.length === 0 && (
        <div className="px-3.5 py-8 text-center text-xs text-text3">
          Нет статей
        </div>
      )}
    </div>
  );
}
