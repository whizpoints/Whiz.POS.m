import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  function convertLessThanOneThousand(n: number): string {
    let words = '';
    if (n >= 100) {
      words += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      words += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      words += ones[n] + ' ';
    }
    return words.trim();
  }

  let words = '';
  let scaleIndex = 0;
  
  let currentNum = Math.floor(num);
  const cents = Math.round((num - currentNum) * 100);

  while (currentNum > 0) {
    const chunk = currentNum % 1000;
    if (chunk > 0) {
      const chunkWords = convertLessThanOneThousand(chunk);
      words = chunkWords + (scales[scaleIndex] ? ' ' + scales[scaleIndex] + ' ' : ' ') + words;
    }
    currentNum = Math.floor(currentNum / 1000);
    scaleIndex++;
  }

  words = words.trim();
  if (cents > 0) {
     words += ` and ${cents}/100`;
  }

  return words;
}
