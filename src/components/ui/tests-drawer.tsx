import { useEffect, useState, type JSX } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, ArrowRight, Tag, Calendar } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { db, type SavedTlvTest, type SavedIsoTest } from "@/utils/db/db";

type TestType = "tlv" | "iso8583";

interface TestsDrawerProps {
  testType: TestType;
  children: JSX.Element;
  onLoad: (data: string, options?: Record<string, unknown>) => void;
}

export function TestsDrawer({ 
  testType, 
  children, 
  onLoad 
}: TestsDrawerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [tests, setTests] = useState<Array<SavedTlvTest | SavedIsoTest>>([]);
  const [filteredTests, setFilteredTests] = useState<Array<SavedTlvTest | SavedIsoTest>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<SavedTlvTest | SavedIsoTest | null>(null);

  // Load tests from the database
  const loadTests = async () => {
    try {
      let loadedTests;
      if (testType === "tlv") {
        loadedTests = await db.getTlvTests();
      } else {
        loadedTests = await db.getIsoTests();
      }
      setTests(loadedTests);
      setFilteredTests(loadedTests);
    } catch (error) {
      toast.error(`Error loading saved tests: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Load tests when drawer opens
  useEffect(() => {
    if (open) {
      loadTests();
    }
  }, [open]);

  // Filter tests when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTests(tests);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = tests.filter(
      (test) =>
        test.name.toLowerCase().includes(term) ||
        (test.description?.toLowerCase().includes(term)) ||
        (test.tags?.some((tag) => tag.toLowerCase().includes(term)))
    );
    setFilteredTests(filtered);
  }, [searchTerm, tests]);

  // Handle loading a test
  const handleLoad = (test: SavedTlvTest | SavedIsoTest) => {
    try {
      if (testType === "tlv") {
        const tlvTest = test as SavedTlvTest;
        onLoad(tlvTest.hexData);
      } else {
        const isoTest = test as SavedIsoTest;
        onLoad(isoTest.message, { version: isoTest.version, ...isoTest.options });
      }
      setOpen(false);
      toast.success(`Test "${test.name}" loaded successfully`);
    } catch (error) {
      toast.error(`Error loading test: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Handle deleting a test
  const handleDelete = async () => {
    if (!selectedTest || !selectedTest.id) return;
    
    try {
      if (testType === "tlv") {
        await db.deleteTlvTest(selectedTest.id);
      } else {
        await db.deleteIsoTest(selectedTest.id);
      }
      
      // Refresh the list
      await loadTests();
      toast.success(`Test "${selectedTest.name}" deleted successfully`);
    } catch (error) {
      toast.error(`Error deleting test: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTest(null);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-4xl">
            <DrawerHeader>
              <DrawerTitle>Saved Tests</DrawerTitle>
              <DrawerDescription>
                View and load your previously saved {testType === "tlv" ? "TLV" : "ISO 8583"} tests
              </DrawerDescription>
              <div className="mt-4">
                <Input
                  placeholder="Search by name, description or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </DrawerHeader>
            <ScrollArea className="h-[60vh] px-4">
              {filteredTests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {filteredTests.map((test) => (
                    <Card key={test.id} className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                        <CardDescription className="flex items-center text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(test.date)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        {test.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {test.description}
                          </p>
                        )}
                        {test.tags && test.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {test.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs font-normal"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="pt-0 flex justify-between">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedTest(test);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete this test</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleLoad(test)}
                          className="gap-1"
                        >
                          Load <ArrowRight className="h-3 w-3" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40">
                  <p className="text-muted-foreground mb-2">No saved tests found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Save a test to see it here"}
                  </p>
                </div>
              )}
            </ScrollArea>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test
              "{selectedTest?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
