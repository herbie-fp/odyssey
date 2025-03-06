import React from "react";
import "./newLocalError.css";

function NewLocalError({ expressionId }: { expressionId: number }){
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border border-gray-300 bg-white">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2 text-left">Program</th>
            <th className="border px-4 py-2 text-left">R Value</th>
            <th className="border px-4 py-2 text-left">FP Value</th>
            <th className="border px-4 py-2 text-left">Difference</th>
            <th className="border px-4 py-2 text-left">Accuracy</th>
            <th className="border px-4 py-2 text-left">Local Error</th>
          </tr>
        </thead>
        <tbody>
          {/* Placeholder row for structure */}
          <tr>
            <td className="border px-4 py-2">/</td>
            <td className="border px-4 py-2">-</td>
            <td className="border px-4 py-2">-</td>
            <td className="border px-4 py-2">-</td>
            <td className="border px-4 py-2">-</td>
            <td className="border px-4 py-2">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default NewLocalError;
