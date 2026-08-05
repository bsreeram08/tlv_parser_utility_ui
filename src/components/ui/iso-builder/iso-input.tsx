/**
 * ISO 8583 Input Component
 *
 * A component for entering and validating ISO 8583 message data.
 */

import { useEffect, useId, useState, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Eraser, FlaskConical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Iso8583Version } from "@/types/iso8583";
import { isSupportedIso8583Message } from "@/utils/iso8583";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

// Form schema for ISO 8583 input
const formSchema = z.object({
  message: z.string().min(20, {
    message: "ISO 8583 message must be at least 20 characters.",
  }),
  version: z.nativeEnum(Iso8583Version),
  binaryBitmap: z.boolean().default(false),
  validateFields: z.boolean().default(true),
});

interface IsoInputProps {
  onParse: (
    message: string,
    options: {
      version: Iso8583Version;
      binaryBitmap: boolean;
      validateFields: boolean;
    }
  ) => void;
  initialValue?: string;
  onLoadExample?: () => void;
}

export function IsoInput({
  onParse,
  initialValue = "",
  onLoadExample,
}: IsoInputProps): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const messageId = useId();

  // Set up form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: initialValue,
      version: Iso8583Version.V1987,
      binaryBitmap: false,
      validateFields: true,
    },
  });

  const { setValue } = form;
  const messageValue = form.watch("message");
  const trimmedMessage = messageValue.trim();

  useEffect(() => {
    setValue("message", initialValue, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [initialValue, setValue]);

  /**
   * Validate ISO 8583 message
   */
  const validateMessage = (message: string): boolean => {
    if (!isSupportedIso8583Message(message)) {
      setError(
        "Enter a supported ISO 8583 message starting with a text MTI or a hex-encoded payload whose first 4 bytes decode to the MTI"
      );
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
        validateFields: values.validateFields,
      });
    }
  };

  const handleClear = () => {
    setValue("message", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setError(null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-3">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <FormLabel htmlFor={messageId}>
                      ISO 8583 Message
                    </FormLabel>
                    {trimmedMessage && (
                      <Badge variant="outline">
                        {trimmedMessage.length} characters
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {onLoadExample && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onLoadExample}
                      >
                        <FlaskConical className="mr-2 h-4 w-4" />
                        Load example
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      disabled={!trimmedMessage}
                    >
                      <Eraser className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>
                <FormControl>
                  <Textarea
                    id={messageId}
                    placeholder="Enter a text ISO 8583 message or a hex-encoded binary/EBCDIC payload"
                    className="h-24 resize-y font-mono"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Plain text and hex-encoded ASCII or EBCDIC payloads are supported.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(24rem,1.3fr)]">
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
                    <SelectItem value={Iso8583Version.V1987}>
                      ISO 8583:1987
                    </SelectItem>
                    <SelectItem value={Iso8583Version.V1993}>
                      ISO 8583:1993
                    </SelectItem>
                    <SelectItem value={Iso8583Version.V2003}>
                      ISO 8583:2003
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the ISO 8583 version for parsing
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="binaryBitmap"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-2">
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
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-2">
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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Parse ISO 8583 Message
          </Button>
        </div>
      </form>
    </Form>
  );
}
