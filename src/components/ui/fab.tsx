import { useState, type JSX } from "react";
import {
  Plus,
  AlertOctagon,
  FileText,
  Code,
  Share2,
  Settings,
  XCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import type { TlvParsingError } from "@/types/tlv";
import { toast } from "sonner";

interface FloatingActionButtonProps {
  errors: TlvParsingError[];
  onExportJson?: () => void;
  onShowExample?: () => void;
  onCopyResults?: () => void;
  onSave?: () => void;
  hasResults: boolean;
}

export function FloatingActionButton({
  errors,
  onExportJson,
  onShowExample,
  onCopyResults,
  onSave,
  hasResults,
}: FloatingActionButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const handleShowErrors = () => {
    if (errors.length > 0) {
      setErrorDialogOpen(true);
    } else {
      toast.info("No errors to display");
    }
  };

  const handleCopyResults = () => {
    if (onCopyResults) {
      onCopyResults();
      toast.success("Results copied to clipboard");
    }
  };

  const handleExportJson = () => {
    if (onExportJson) {
      onExportJson();
      toast.success("Results exported as JSON");
    }
  };

  const handleShowExample = () => {
    if (onShowExample) {
      onShowExample();
      toast.info("Example loaded");
    }
  };

  return (
    <>
      {/* Main Floating Action Button */}
      <div className="fixed right-6 bottom-6 z-50">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
              <Plus
                className={`h-6 w-6 transition-transform duration-200 ${
                  isOpen ? "rotate-45" : ""
                }`}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              disabled={errors.length === 0}
              onClick={handleShowErrors}
            >
              <AlertOctagon className="mr-2 h-4 w-4" />
              <span>Show Errors</span>
              {errors.length > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {errors.length}
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasResults}
              onClick={handleCopyResults}
            >
              <Code className="mr-2 h-4 w-4" />
              <span>Copy Results</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!hasResults} onClick={handleExportJson}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Export as JSON</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShowExample}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Load Example</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onSave}
              disabled={!hasResults || !onSave}
            >
              <Save className="mr-2 h-4 w-4" />
              <span>Save Test</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialogOpen}
        setOpen={setErrorDialogOpen}
        errors={errors}
      />
    </>
  );
}

interface ErrorDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  errors: TlvParsingError[];
}

function ErrorDialog({ open, setOpen, errors }: ErrorDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertOctagon className="mr-2 h-5 w-5 text-destructive" />
            Parsing Errors
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {errors.length > 0 ? (
            <ul className="space-y-2">
              {errors.map((error, index) => (
                <li key={index} className="bg-muted p-3 rounded-md flex">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{error.message}</p>
                    {error.offset !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        At offset: 0x{error.offset.toString(16).toUpperCase()}
                      </p>
                    )}
                    {error.tagId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tag ID: {error.tagId}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              No errors to display
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
