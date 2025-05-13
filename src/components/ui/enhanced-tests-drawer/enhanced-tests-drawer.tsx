/**
 * Enhanced Tests Drawer
 *
 * A component for displaying, filtering, and managing saved TLV and ISO8583 tests
 * with enhanced filtering, favorites, categories, and sorting capabilities.
 */

import { useEffect, useState, useCallback, type JSX } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, ArrowRight, Tag, Calendar, Star, StarOff } from "lucide-react";
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

interface EnhancedTestsDrawerProps {
  testType: TestType;
  children: JSX.Element;
  onLoad: (data: string, options?: Record<string, unknown>) => void;
}

export function EnhancedTestsDrawer({ 
  testType, 
  children, 
  onLoad 
}: EnhancedTestsDrawerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [tests, setTests] = useState<Array<SavedTlvTest | SavedIsoTest>>([]);
  const [filteredTests, setFilteredTests] = useState<Array<SavedTlvTest | SavedIsoTest>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<SavedTlvTest | SavedIsoTest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "name" | "lastAccessed">("newest");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Load tests from the database
  const loadTests = useCallback(async (): Promise<void> => {
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
  }, [testType]);

  // Load tests when drawer opens
  useEffect(() => {
    if (open) {
      loadTests();
    }
  }, [open, loadTests]);

  // Extract all unique categories when tests change
  useEffect(() => {
    if (tests.length === 0) return;
    
    const categories = tests
      .map(test => test.category)
      .filter((category): category is string => !!category)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
      
    setAvailableCategories(categories);
  }, [tests]);

  // Apply all filters and sorting
  useEffect(() => {
    let filtered = [...tests];
    
    // Apply search term filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (test) =>
          test.name.toLowerCase().includes(term) ||
          (test.description?.toLowerCase().includes(term)) ||
          (test.tags?.some((tag) => tag.toLowerCase().includes(term)))
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(test => test.category === selectedCategory);
    }
    
    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(test => test.favorite);
    }
    
    // Apply sorting
    switch (sortOption) {
      case "newest":
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "lastAccessed":
        filtered.sort((a, b) => {
          const aTime = a.lastAccessed ? new Date(a.lastAccessed).getTime() : 0;
          const bTime = b.lastAccessed ? new Date(b.lastAccessed).getTime() : 0;
          return bTime - aTime;
        });
        break;
    }
    
    setFilteredTests(filtered);
  }, [searchTerm, tests, selectedCategory, showFavoritesOnly, sortOption]);

  // Toggle favorite status for a test
  const toggleFavorite = async (test: SavedTlvTest | SavedIsoTest): Promise<void> => {
    if (!test.id) return;
    
    const isFavorite = !test.favorite;
    try {
      if (testType === "tlv") {
        await db.tlvTests.update(test.id, { favorite: isFavorite });
      } else {
        await db.isoTests.update(test.id, { favorite: isFavorite });
      }
      
      // Update the test in the current list
      setTests(prevTests => 
        prevTests.map(t => 
          t.id === test.id ? { ...t, favorite: isFavorite } : t
        )
      );
      
      toast.success(`${isFavorite ? "Added to" : "Removed from"} favorites`);
    } catch (error) {
      toast.error(`Error updating favorite status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Handle loading a test
  const handleLoad = (test: SavedTlvTest | SavedIsoTest): void => {
    try {
      if (testType === "tlv") {
        const tlvTest = test as SavedTlvTest;
        
        // Update the last accessed timestamp
        if (tlvTest.id) {
          db.tlvTests.update(tlvTest.id, {
            lastAccessed: new Date()
          }).catch(error => {
            console.error("Error updating lastAccessed timestamp:", error);
          });
        }
        
        // Pass the data to the parent component
        onLoad(tlvTest.tlvData, { 
          id: tlvTest.id,
          category: tlvTest.category, 
          favorite: tlvTest.favorite 
        });
      } else {
        const isoTest = test as SavedIsoTest;
        
        // Update the last accessed timestamp
        if (isoTest.id) {
          db.isoTests.update(isoTest.id, {
            lastAccessed: new Date()
          }).catch(error => {
            console.error("Error updating lastAccessed timestamp:", error);
          });
        }
        
        // Pass the data to the parent component
        onLoad(isoTest.isoData, { 
          id: isoTest.id,
          version: isoTest.version, 
          category: isoTest.category,
          favorite: isoTest.favorite,
          messageType: isoTest.messageType,
          ...(isoTest.options || {})
        });
      }
      setOpen(false);
      toast.success(`Test "${test.name}" loaded successfully`);
    } catch (error) {
      toast.error(`Error loading test: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Handle deleting a test
  const handleDelete = async (): Promise<void> => {
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
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "2-digit",
      month: "short",
      day: "numeric",
    });
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
              
              <div className="flex flex-col gap-3 mt-4">
                <Input
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                <div className="flex flex-row gap-2">
                  {/* Category Filter */}
                  <Select 
                    value={selectedCategory || ""} 
                    onValueChange={(val) => setSelectedCategory(val || null)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {availableCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Sort Options */}
                  <Select value={sortOption} onValueChange={(val) => setSortOption(val as any)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="lastAccessed">Recently Used</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Favorites Toggle */}
                  <Button
                    variant={showFavoritesOnly ? "default" : "outline"}
                    size="icon"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    title={showFavoritesOnly ? "Showing favorites only" : "Show all tests"}
                  >
                    {showFavoritesOnly ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </DrawerHeader>
            <ScrollArea className="h-[60vh] px-4">
              {filteredTests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {filteredTests.map((test, index) => (
                    <Card 
                      key={test.id || index} 
                      className={`group ${test.favorite ? "border-yellow-300" : ""}`}
                    >
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
                        {test.category && (
                          <div className="flex items-center gap-1 mb-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {test.category}
                            </Badge>
                          </div>
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
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(test);
                                  }}
                                >
                                  {test.favorite ? 
                                    <Star className="h-4 w-4 text-yellow-500" /> : 
                                    <Star className="h-4 w-4 text-muted-foreground" />
                                  }
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{test.favorite ? "Remove from favorites" : "Add to favorites"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                        </div>
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
                    {searchTerm || selectedCategory || showFavoritesOnly
                      ? "Try adjusting your search filters"
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
