import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface TagActionsMenuProps {
  tag: string;
  path?: string;
  /** Optional callback invoked when the user selects Edit Value */
  onEdit?: () => void;
  /** Optional callback invoked when the user confirms Delete Tag */
  onDelete?: () => void;
}

export function TagActionsMenu({
  tag,
  path,
  onEdit,
  onDelete,
}: TagActionsMenuProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div className="flex shrink-0 items-center gap-0.5">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onEdit}
            aria-label={`Edit value for tag ${tag}`}
            title="Edit value"
          >
            <Edit3 className="size-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete tag ${tag}`}
            title="Delete tag"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag {tag}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <span className="font-mono">{path || tag}</span> from
              the payload and recalculates the length of any enclosing
              constructed tag. Undo is available from the floating action button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                onDelete?.();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
