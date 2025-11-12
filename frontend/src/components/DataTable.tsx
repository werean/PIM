import { type ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  sortField?: string | null;
  sortOrder?: "asc" | "desc" | "default";
  onSort?: (field: string) => void;
  getRowKey: (item: T) => string | number;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  error = null,
  emptyMessage = "Nenhum registro encontrado",
  onRowClick,
  sortField = null,
  sortOrder = "default",
  onSort,
  getRowKey,
}: DataTableProps<T>) {
  const getSortIndicator = (field: string) => {
    if (sortField !== field) return "";
    if (sortOrder === "asc") return " ↑";
    if (sortOrder === "desc") return " ↓";
    return "";
  };

  return (
    <div className="data-table">
      <table className="data-table__table">
        <thead className="data-table__head">
          <tr className="data-table__head-row">
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
                className={`data-table__head-cell ${
                  column.sortable ? "data-table__head-cell--sortable" : ""
                } ${sortField === column.key ? "data-table__head-cell--active" : ""} ${
                  column.className || ""
                }`}
              >
                {column.label}
                {column.sortable && getSortIndicator(column.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="data-table__body">
          {loading && (
            <tr className="data-table__row">
              <td colSpan={columns.length} className="data-table__cell data-table__cell--center">
                Carregando...
              </td>
            </tr>
          )}
          {error && !loading && (
            <tr className="data-table__row">
              <td
                colSpan={columns.length}
                className="data-table__cell data-table__cell--error data-table__cell--center"
              >
                {error}
              </td>
            </tr>
          )}
          {!loading && !error && data.length === 0 && (
            <tr className="data-table__row">
              <td colSpan={columns.length} className="data-table__cell data-table__cell--center">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            data.map((item) => (
              <tr
                key={getRowKey(item)}
                onClick={() => onRowClick?.(item)}
                className={`data-table__row ${onRowClick ? "data-table__row--clickable" : ""}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`data-table__cell ${column.className || ""}`}>
                    {column.render
                      ? column.render(item)
                      : String((item as Record<string, unknown>)[column.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
