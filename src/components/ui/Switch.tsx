"use client"

import * as React from "react"
import { Switch as HeadlessSwitch } from '@headlessui/react'
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof HeadlessSwitch>,
  React.ComponentPropsWithoutRef<typeof HeadlessSwitch>
>(({ className, ...props }, ref) => (
    <HeadlessSwitch
        ref={ref}
        className={cn(
            'group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            'bg-gray-200 data-[checked]:bg-indigo-600',
            className
        )}
        {...props}
    >
        <span
            aria-hidden="true"
            className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                'translate-x-0 group-data-[checked]:translate-x-5'
            )}
        />
    </HeadlessSwitch>
))

Switch.displayName = "Switch"

export { Switch }
