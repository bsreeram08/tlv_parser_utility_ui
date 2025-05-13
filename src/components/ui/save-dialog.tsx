import { useState, type JSX } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, tags: string[]) => void;
  title: string;
  description: string;
}

export function SaveDialog({
  isOpen,
  onClose,
  onSave,
  title,
  description,
}: SaveDialogProps): JSX.Element {
  const [name, setName] = useState<string>("");
  const [testDescription, setTestDescription] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please provide a name for this test");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Parse tags from comma-separated string
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");
      
      // Call the parent's save handler
      await onSave(name, testDescription, tags);
      
      // Reset form
      setName("");
      setTestDescription("");
      setTagsInput("");
      
      // Close dialog
      onClose();
      
      // Show success message
      toast.success("Test saved successfully");
    } catch (error) {
      toast.error(`Error saving test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close handler resets form
  const handleClose = () => {
    setName("");
    setTestDescription("");
    setTagsInput("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="My Test"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Tags
            </Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="col-span-3"
              placeholder="tag1, tag2, tag3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={testDescription}
              onChange={(e) => setTestDescription(e.target.value)}
              className="col-span-3"
              placeholder="Optional description of this test"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
