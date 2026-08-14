const fs = require('fs');

const path = 'src/components/BusinessRegistration.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Add SweetAlert import
content = content.replace(
  "from 'lucide-react';",
  "from 'lucide-react';\nimport Swal from 'sweetalert2';"
);

// Find the handleNext function and add handleSearchData before it
const handleNextStr = "  const handleNext = () => {";
const handleSearchDataStr = `
  const handleSearchData = async () => {
    if (window.electron && window.electron.readData) {
      const data = await window.electron.readData('business-setup.json');
      if (data && data.isSetup) {
        Swal.fire({
          title: 'Data Found!',
          text: 'Business data has been found successfully. The application will now restart to apply it.',
          icon: 'success',
          confirmButtonText: 'Restart Now',
          confirmButtonColor: '#3085d6',
          background: '#1e293b',
          color: '#ffffff'
        }).then(() => {
          window.location.reload();
        });
      } else {
        Swal.fire({
          title: 'No Data Found',
          text: 'Sorry, no valid business data was found. Please proceed to create an account.',
          icon: 'error',
          confirmButtonText: 'Create Account',
          confirmButtonColor: '#d33',
          background: '#1e293b',
          color: '#ffffff'
        }).then(() => {
          // Go to the first step (businessName) which is index 1
          setCurrentStepIndex(1);
        });
      }
    } else {
        Swal.fire({
          title: 'Error',
          text: 'Unable to access local storage mechanism.',
          icon: 'error',
          background: '#1e293b',
          color: '#ffffff'
        });
    }
  };

`;

content = content.replace(handleNextStr, handleSearchDataStr + handleNextStr);

// Find the "Search Detailed Data" button and update its onClick handler
const buttonStr = `<button
                disabled={isSubmitting}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <FileSearch className="w-6 h-6" />
                2. Search Detailed Data
              </button>`;

const newButtonStr = `<button
                disabled={isSubmitting}
                onClick={handleSearchData}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <FileSearch className="w-6 h-6" />
                2. Search Detailed Data
              </button>`;

content = content.replace(buttonStr, newButtonStr);

fs.writeFileSync(path, content);
console.log("Updated BusinessRegistration.tsx successfully");
