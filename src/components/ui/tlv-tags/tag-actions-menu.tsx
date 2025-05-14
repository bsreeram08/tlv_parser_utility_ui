import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, MoreHorizontal, TagIcon, FileText } from "lucide-react";

export interface TagActionsMenuProps {
  tag: string;
  value: string;
  path?: string;
}

export function TagActionsMenu({
  tag,
  value,
  path: _path,
}: TagActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleCopyTag = async () => {
    await navigator.clipboard.writeText(tag);
    toast.success(`Tag ${tag} copied to clipboard`);
    setOpen(false);
  };

  const handleCopyValue = async () => {
    await navigator.clipboard.writeText(value);
    toast.success(`Value copied to clipboard`);
    setOpen(false);
  };

  const handleCopyTagAndValue = async () => {
    await navigator.clipboard.writeText(`${tag}: ${value}`);
    toast.success(`Tag and value copied to clipboard`);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="link"
          size="icon"
          className="h-6 w-6 hover:bg-primary/10"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyTag}>
          <TagIcon className="mr-2 h-4 w-4" />
          <span>Copy Tag</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyValue}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Copy Value</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyTagAndValue}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy Tag & Value</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
