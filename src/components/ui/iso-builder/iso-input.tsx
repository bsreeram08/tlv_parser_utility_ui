/**
 * ISO 8583 Input Component
 * 
 * A component for entering and validating ISO 8583 message data.
 */

import { useState, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Iso8583Version } from "@/types/iso8583";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Switch } from "@/components/ui/switch";

// Form schema for ISO 8583 input
const formSchema = z.object({
  message: z.string().min(20, {
    message: "ISO 8583 message must be at least 20 characters."
  }),
  version: z.nativeEnum(Iso8583Version),
  binaryBitmap: z.boolean().default(false),
  validateFields: z.boolean().default(true)
});

interface IsoInputProps {
  onParse: (message: string, options: { 
    version: Iso8583Version; 
    binaryBitmap: boolean;
    validateFields: boolean;
  }) => void;
  initialValue?: string;
}

export function IsoInput({ onParse, initialValue = "" }: IsoInputProps): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  // Set up form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: initialValue,
      version: Iso8583Version.V1987,
      binaryBitmap: false,
      validateFields: true
    },
  });

  /**
   * Validate ISO 8583 message
   */
  const validateMessage = (message: string): boolean => {
    // Basic validation - minimum length and hex/numeric format for MTI
    if (message.trim().length < 20) {
      setError("ISO 8583 message must be at least 20 characters (MTI + Primary Bitmap)");
      return false;
    }
    
    // Check if MTI is 4 digits
    const mti = message.trim().substring(0, 4);
    if (!/^\d{4}$/.test(mti)) {
      setError("MTI must be 4 digits");
      return false;
    }
    
    setError(null);
    return true;
  };

  /**
   * Handle form submission
   */
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (validateMessage(values.message)) {
      onParse(values.message, {
        version: values.version,
        binaryBitmap: values.binaryBitmap,
        validateFields: values.validateFields
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ISO 8583 Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter ISO 8583 message (e.g., 0100722000000000000004000000000000001234)"
                  className="font-mono h-36 resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the full ISO 8583 message starting with the MTI
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ISO 8583 Version</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={Iso8583Version.V1987}>ISO 8583:1987</SelectItem>
                    <SelectItem value={Iso8583Version.V1993}>ISO 8583:1993</SelectItem>
                    <SelectItem value={Iso8583Version.V2003}>ISO 8583:2003</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the ISO 8583 version for parsing
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="binaryBitmap"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Binary Bitmap</FormLabel>
                    <FormDescription>
                      Parse bitmap as binary instead of hex
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validateFields"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Validate Fields</FormLabel>
                    <FormDescription>
                      Validate fields against specifications
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
          >
            Parse ISO 8583 Message
          </Button>
        </div>
      </form>
    </Form>
  );
}
