import { useState, useEffect, type JSX } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CustomTagForm } from "./custom-tag-form";
import { db } from "@/utils/db/db";
import { toast } from "sonner";
import { Search, Plus, MoreVertical, Edit, Trash2, Tag } from "lucide-react";
import {
  LengthRuleType,
  type CustomTagCreationParams,
  type CustomTagDefinition,
} from "@/types/custom-tag";
import { Badge } from "@/components/ui/badge";

export function CustomTagManager(): JSX.Element {
  const [tags, setTags] = useState<CustomTagDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredTags, setFilteredTags] = useState<CustomTagDefinition[]>([]);
  
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<CustomTagDefinition | null>(null);

  // Load all custom tags
  const loadTags = async () => {
    setLoading(true);
    try {
      const allTags = await db.getAllCustomTags();
      setTags(allTags);
      setFilteredTags(allTags);
    } catch (error) {
      toast.error(`Error loading custom tags: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, []);

  // Filter tags when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTags(tags);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tags.filter(
      (tag) =>
        tag.id.toLowerCase().includes(query) ||
        tag.name.toLowerCase().includes(query) ||
        (tag.description?.toLowerCase() || "").includes(query)
    );
    setFilteredTags(filtered);
  }, [searchQuery, tags]);

  // Handle tag creation
  const handleCreateTag = async (tagParams: CustomTagCreationParams) => {
    // Create new tag with creation date
    const newTag: CustomTagDefinition = {
      ...tagParams,
      created: new Date(),
    };
    
    await db.addCustomTag(newTag);
    await loadTags();
  };

  // Handle tag update
  const handleUpdateTag = async (tagParams: CustomTagCreationParams) => {
    if (!selectedTag) return;
    
    // Create updated tag with original creation date and new modified date
    const updatedTag: CustomTagDefinition = {
      ...tagParams,
      created: selectedTag.created,
      modified: new Date(),
    };
    
    await db.updateCustomTag(updatedTag);
    await loadTags();
  };

  // Handle tag deletion
  const handleDeleteTag = async () => {
    if (!selectedTag) return;
    
    try {
      await db.deleteCustomTag(selectedTag.id);
      toast.success(`Tag ${selectedTag.name} deleted successfully`);
      await loadTags();
      setDeleteDialogOpen(false);
      setSelectedTag(null);
    } catch (error) {
      toast.error(`Error deleting tag: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Format length rules for display
  const formatLengthRule = (tag: CustomTagDefinition): string => {
    const { lengthRule } = tag;
    
    if (lengthRule.type === LengthRuleType.Fixed) {
      return `Fixed: ${lengthRule.fixed} bytes`;
    } else if (lengthRule.type === LengthRuleType.Variable) {
      return `Variable: ${lengthRule.min || 0}-${lengthRule.max} bytes`;
    } else {
      return "Any length";
    }
  };


  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Custom Tag Management</CardTitle>
            <CardDescription>
              Create and manage custom EMV tags for use in the TLV parser
            </CardDescription>
          </div>
          <Button 
            onClick={() => setAddDialogOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Add Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tags by ID, name, or description..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">Loading custom tags...</p>
          </div>
        ) : filteredTags.length > 0 ? (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[15%]">Tag ID</TableHead>
                  <TableHead className="w-[25%]">Name</TableHead>
                  <TableHead className="w-[20%]">Format</TableHead>
                  <TableHead className="w-[25%]">Length Rule</TableHead>
                  <TableHead className="w-[15%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-mono font-medium">{tag.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{tag.name}</div>
                      {tag.description && (
                        <div className="text-xs text-muted-foreground">
                          {tag.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="mr-1">
                        {tag.format}
                      </Badge>
                      <Badge variant="secondary">
                        {tag.dataFormat}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatLengthRule(tag)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTag(tag);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTag(tag);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 border rounded-md">
            <Tag className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {searchQuery
                ? "No tags match your search criteria"
                : "No custom tags defined yet"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setAddDialogOpen(true)}
            >
              Create your first custom tag
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex justify-between items-center w-full">
          <p className="text-sm text-muted-foreground">
            {filteredTags.length} custom tag{filteredTags.length !== 1 ? "s" : ""} found
            {searchQuery && tags.length !== filteredTags.length
              ? ` (filtered from ${tags.length} total)`
              : ""}
          </p>
          {filteredTags.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => loadTags()}>
              Refresh
            </Button>
          )}
        </div>
      </CardFooter>

      {/* Add Dialog */}
      <CustomTagForm
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSave={handleCreateTag}
        title="Add Custom Tag"
        description="Define a new EMV tag to use in the TLV parser"
      />

      {/* Edit Dialog */}
      {selectedTag && (
        <CustomTagForm
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedTag(null);
          }}
          onSave={handleUpdateTag}
          editTag={selectedTag}
          title="Edit Custom Tag"
          description={`Editing tag ${selectedTag.id}: ${selectedTag.name}`}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the custom tag "{selectedTag?.name}" ({selectedTag?.id}). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTag(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
