import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentData } from '@/src/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  students: StudentData[];
  errors?: { row: number; message: string; data?: string }[];
}

export function ImportModal({ isOpen, onClose, onConfirm, students, errors = [] }: ImportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b bg-slate-50/50">
          <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Review Student List</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-bold text-red-800 mb-2">Import Errors ({errors.length})</h3>
              <div className="text-[10px] space-y-1">
                {errors.map((e, i) => (
                  <div key={i} className="text-red-700">Row {e.row}: {e.message}</div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {students.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-3 py-1 border-b border-slate-100 last:border-0">
                <span className="text-[10px] font-mono text-slate-400 w-4">{idx + 1}</span>
                <span className="text-[10px] font-mono text-slate-600 w-16">{s.id}</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[11px] font-medium text-slate-800 truncate">{s.name}</span>
                  {s.major && <span className="text-[9px] text-slate-500 truncate">{s.major}</span>}
                </div>
                {s.status && <span className="text-[9px] font-bold text-red-500">({s.status})</span>}
              </div>
            ))}
          </div>
        </div>
...

        <DialogFooter className="p-4 border-t bg-slate-50/50 flex flex-row items-center justify-between sm:justify-between gap-4">
          <Button 
            onClick={onConfirm}
            className="bg-white hover:bg-[#FFEE82] text-slate-900 font-bold uppercase tracking-wider text-[10px] px-6 h-10 border-2 border-slate-300 hover:border-[#FFEE82] transition-all shadow-sm"
          >
            IMPORT
          </Button>
          <Button 
            variant="destructive"
            onClick={onClose}
            className="bg-white hover:bg-[#FFEE82] text-red-600 font-bold uppercase tracking-wider text-[10px] px-6 h-10 border-2 border-slate-300 hover:border-[#FFEE82] transition-all shadow-sm"
          >
            CLOSE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
