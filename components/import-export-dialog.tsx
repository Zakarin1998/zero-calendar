"use client"

import type React from "react"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { importEventsFromICS, exportEventsToICS } from "@/lib/calendar"
import { UploadIcon, DownloadIcon, FileIcon, CheckIcon, AlertCircleIcon, XIcon } from "lucide-react"

interface ImportExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ImportExportDialog({ open, onOpenChange, onSuccess }: ImportExportDialogProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("import")
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!file || !session?.user?.id) return

    setIsProcessing(true)
    try {
      const fileContent = await file.text()
      const result = await importEventsFromICS(session.user.id, fileContent)

      if (result.success) {
        toast({
          title: "Import successful",
          description: `Successfully imported ${result.count} events`,
        })
        if (onSuccess) onSuccess()
        onOpenChange(false)
      } else {
        toast({
          title: "Import failed",
          description: "Failed to import events. Please check the file format and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "An error occurred while importing events",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = async () => {
    if (!session?.user?.id) return

    setIsProcessing(true)
    try {
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)

      const icsContent = await exportEventsToICS(session.user.id, startDate, endDate)

      if (icsContent) {
        // Create a blob and download link
        const blob = new Blob([icsContent], { type: "text/calendar" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `zero-calendar-export-${new Date().toISOString().split("T")[0]}.ics`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "Export successful",
          description: "Your calendar has been exported successfully",
        })
      } else {
        toast({
          title: "Export failed",
          description: "Failed to export events",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "An error occurred while exporting events",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import/Export Calendar</DialogTitle>
          <DialogDescription>Import events from an ICS file or export your calendar to ICS format</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ics-file">Select ICS File</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileIcon className="h-8 w-8 text-mono-500" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-mono-500">{(file.size / 1024).toFixed(2)} KB</p>
                    <Button variant="outline" size="sm" onClick={() => setFile(null)} className="mt-2">
                      <XIcon className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadIcon className="h-8 w-8 text-mono-500" />
                    <p className="text-sm">Drag and drop your ICS file here, or click to browse</p>
                    <Input id="ics-file" type="file" accept=".ics" onChange={handleFileChange} className="hidden" />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("ics-file")?.click()}
                      className="mt-2"
                    >
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file || isProcessing} className="gap-2">
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Import Events
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="export-start">Start Date</Label>
                <Input
                  id="export-start"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="export-end">End Date</Label>
                <Input
                  id="export-end"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                />
              </div>

              <div className="rounded-lg bg-mono-100 dark:bg-mono-800 p-3 text-sm flex items-start gap-2">
                <AlertCircleIcon className="h-5 w-5 text-mono-500 flex-shrink-0 mt-0.5" />
                <p>
                  This will export all events between the selected dates in ICS format, which can be imported into other
                  calendar applications.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={isProcessing} className="gap-2">
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <DownloadIcon className="h-4 w-4" />
                    Export Calendar
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
