"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTransition, useState } from "react"
import { toast } from "sonner"
import {
  ImageOff,
  MoreHorizontal,
  Pencil,
  Package,
  Trash2,
  Wrench,
} from "lucide-react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteProduct, type ProductRow } from "@/features/products/actions"
import { ProductForm } from "@/features/products/components/product-form"
import { PRODUCT_TYPE_LABELS } from "@/lib/validations/product"
import { createSignedUrl } from "@/services/storage/upload"

interface ProductsTableProps {
  products: ProductRow[]
  imageUrls: Record<string, string>
}

function ProductTypeBadge({ type }: { type: "product" | "service" }) {
  if (type === "service") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Wrench className="size-3" />
        Service
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Package className="size-3" />
      Product
    </Badge>
  )
}

function ProductThumbnail({
  imageUrl,
  name,
}: {
  imageUrl: string | undefined
  name: string
}) {
  const [failed, setFailed] = useState(false)

  if (!imageUrl || failed) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
        <ImageOff className="size-5" />
      </div>
    )
  }

  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
      <Image
        src={imageUrl}
        alt={name}
        fill
        className="object-cover"
        onError={() => setFailed(true)}
        unoptimized
      />
    </div>
  )
}

function ActionsMenu({
  product,
  onDeleted,
}: {
  product: ProductRow
  onDeleted: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteProduct(product.id)
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success(`${PRODUCT_TYPE_LABELS[product.type]} deleted`)
        setConfirmOpen(false)
        onDeleted()
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProductForm
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete product?"
        description={`"${product.name}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  )
}

export function ProductsTable({ products, imageUrls }: ProductsTableProps) {
  const router = useRouter()

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No products or services yet"
        description="Add your first product or service by pasting a URL. AI will extract the details for you."
      />
    )
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-28">Type</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <ProductThumbnail
                  imageUrl={imageUrls[product.id]}
                  name={product.name}
                />
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                <ProductTypeBadge type={product.type} />
              </TableCell>
              <TableCell className="hidden max-w-sm md:table-cell">
                {product.description ? (
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {product.description}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell>
                <ActionsMenu
                  product={product}
                  onDeleted={() => router.refresh()}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
