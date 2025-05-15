import { useState, useEffect, type JSX } from "react";
import { sanitizeSelectValues } from "@/utils/select-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CustomTagDataFormat,
  DisplayFormat,
  LengthRuleType,
  type CustomTagCreationParams,
  type CustomTagDefinition,
  type LengthRule,
} from "@/types/custom-tag";
import { TagFormat } from "@/types/tlv";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const tagIdRegex = /^[0-9A-Fa-f]{2,4}$/;

// Validation schema
const customTagSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(tagIdRegex, "Tag ID must be 2-4 hexadecimal characters"),
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must be at most 50 characters"),
  description: z.string().trim().optional(),
  format: z.nativeEnum(TagFormat),
  dataFormat: z.nativeEnum(CustomTagDataFormat),
  lengthRuleType: z.nativeEnum(LengthRuleType),
  fixedLength: z.number().int().positive().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  displayFormat: z.nativeEnum(DisplayFormat),
});

type FormSchema = z.infer<typeof customTagSchema>;

interface CustomTagFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tag: CustomTagCreationParams) => Promise<void>;
  editTag?: CustomTagDefinition;
  initialValues?: Partial<CustomTagCreationParams>;
  title: string;
  description?: string;
}

export function CustomTagForm({
  isOpen,
  onClose,
  onSave,
  editTag,
  initialValues,
  title,
  description,
}: CustomTagFormProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize the form
  const form = useForm<FormSchema>({
    resolver: zodResolver(customTagSchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      format: TagFormat.PRIMITIVE,
      dataFormat: CustomTagDataFormat.Binary,
      lengthRuleType: LengthRuleType.Variable,
      fixedLength: undefined,
      minLength: 1,
      maxLength: 255,
      displayFormat: DisplayFormat.Hex,
    },
  });

  // Update form values when editing an existing tag
  useEffect(() => {
    if ((editTag || initialValues) && isOpen) {
      let formValues: Partial<FormSchema> = {};

      if (editTag) {
        // Sanitize the tag to prevent empty string values which cause errors in Select components
        const safeTag = sanitizeSelectValues(editTag);

        // Initialize lengthRuleType and related fields from lengthRule
        const lengthRuleType = safeTag.lengthRule.type;
        let fixedLength: number | undefined;
        let minLength: number | undefined;
        let maxLength: number | undefined;

        if (lengthRuleType === LengthRuleType.Fixed) {
          fixedLength = safeTag.lengthRule.fixed;
        } else if (lengthRuleType === LengthRuleType.Variable) {
          minLength = safeTag.lengthRule.min;
          maxLength = safeTag.lengthRule.max;
        }

        formValues = {
          id: safeTag.id,
          name: safeTag.name,
          description: safeTag.description || "",
          format: safeTag.format,
          dataFormat: safeTag.dataFormat,
          lengthRuleType,
          fixedLength,
          minLength,
          maxLength,
          displayFormat: safeTag.displayFormat,
        };
      } else if (initialValues) {
        // Sanitize the initial values
        const safeValues = sanitizeSelectValues(initialValues);

        // Initialize from provided initial values
        const lengthRuleType = safeValues.lengthRule?.type;
        let fixedLength: number | undefined;
        let minLength: number | undefined;
        let maxLength: number | undefined;

        if (lengthRuleType === LengthRuleType.Fixed) {
          fixedLength = safeValues.lengthRule?.fixed;
        } else if (lengthRuleType === LengthRuleType.Variable) {
          minLength = safeValues.lengthRule?.min;
          maxLength = safeValues.lengthRule?.max;
        }

        formValues = {
          id: initialValues.id || "",
          name: initialValues.name || "",
          description: initialValues.description || "",
          format: initialValues.format || TagFormat.PRIMITIVE,
          dataFormat: initialValues.dataFormat || CustomTagDataFormat.Binary,
          lengthRuleType: lengthRuleType || LengthRuleType.Variable,
          fixedLength,
          minLength: minLength || 1,
          maxLength: maxLength || 255,
          displayFormat: initialValues.displayFormat || DisplayFormat.Hex,
        };
      }

      form.reset(formValues);
    }
  }, [editTag, initialValues, isOpen, form]);

  // Handle form submit
  const onSubmit = async (values: FormSchema) => {
    setIsSubmitting(true);
    try {
      // Construct the length rule based on the selected type
      let lengthRule: LengthRule;

      if (values.lengthRuleType === LengthRuleType.Fixed) {
        if (!values.fixedLength) {
          toast.error("Fixed length value is required");
          setIsSubmitting(false);
          return;
        }
        lengthRule = {
          type: LengthRuleType.Fixed,
          fixed: values.fixedLength,
        };
      } else if (values.lengthRuleType === LengthRuleType.Variable) {
        if (!values.minLength || !values.maxLength) {
          toast.error(
            "Min and max length values are required for variable length"
          );
          setIsSubmitting(false);
          return;
        }
        if (values.minLength > values.maxLength) {
          toast.error("Min length cannot be greater than max length");
          setIsSubmitting(false);
          return;
        }
        lengthRule = {
          type: LengthRuleType.Variable,
          min: values.minLength,
          max: values.maxLength,
        };
      } else {
        // Any length
        lengthRule = {
          type: LengthRuleType.Any,
        };
      }

      // Create the tag object
      const customTag: CustomTagCreationParams = {
        id: values.id.toUpperCase(), // Normalize to uppercase
        name: values.name,
        description: values.description || undefined,
        format: values.format,
        dataFormat: values.dataFormat,
        lengthRule,
        displayFormat: values.displayFormat,
      };

      // Save the tag
      await onSave(customTag);

      // Reset the form
      form.reset();

      // Close the dialog
      onClose();

      // Show success message
      toast.success(
        `Custom tag ${editTag ? "updated" : "created"} successfully`
      );
    } catch (error) {
      toast.error(
        `Error ${editTag ? "updating" : "creating"} custom tag: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close handler resets form
  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Tag ID */}
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="9F1A"
                        {...field}
                        maxLength={4}
                        disabled={!!editTag} // Disable editing of ID for existing tags
                      />
                    </FormControl>
                    <FormDescription>
                      2-4 character hex value (e.g., "9F1A")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tag Format */}
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag Format</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(TagFormat).map((format) => (
                          <SelectItem key={format} value={format}>
                            {format}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>EMV tag format identifier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tag Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Terminal Country Code" {...field} />
                  </FormControl>
                  <FormDescription>
                    Descriptive name for the tag
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tag Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Details about this tag's purpose and usage"
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional details about the tag
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Data Format */}
              <FormField
                control={form.control}
                name="dataFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Format</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select data format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(CustomTagDataFormat).map((format) => (
                          <SelectItem key={format} value={format}>
                            {format.charAt(0).toUpperCase() + format.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Format of the tag's data</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display Format */}
              <FormField
                control={form.control}
                name="displayFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Format</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select display format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(DisplayFormat).map((format) => (
                          <SelectItem key={format} value={format}>
                            {format.charAt(0).toUpperCase() + format.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How to display the tag value
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Length Rule Type */}
            <FormField
              control={form.control}
              name="lengthRuleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Length Rule</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select length rule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(LengthRuleType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Length constraints for the tag
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional fields based on length rule type */}
            {form.watch("lengthRuleType") === LengthRuleType.Fixed && (
              <FormField
                control={form.control}
                name="fixedLength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fixed Length</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value, 10)
                              : undefined
                          )
                        }
                        min={1}
                        max={255}
                      />
                    </FormControl>
                    <FormDescription>
                      Exact length in bytes (1-255)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch("lengthRuleType") === LengthRuleType.Variable && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Length</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value, 10)
                                : undefined
                            )
                          }
                          min={0}
                          max={255}
                        />
                      </FormControl>
                      <FormDescription>
                        Min length in bytes (0-255)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Length</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value, 10)
                                : undefined
                            )
                          }
                          min={1}
                          max={255}
                        />
                      </FormControl>
                      <FormDescription>
                        Max length in bytes (1-255)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editTag ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
