/* eslint-disable @next/next/no-img-element */
import { EnrichedReport } from '@/types/index';
import { Camera, MessageSquare, Package, User as UserIcon } from 'lucide-react';

interface ReportCardProps {
  report: EnrichedReport;
  onImageClick: (imageUrl: string) => void;
}

export default function ReportCard({ report, onImageClick }: ReportCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-grow min-w-0">
          <div className="flex items-center">
            {report.reportedUserData ? (
              <UserIcon className="w-5 h-5 mr-3 text-orange-500 flex-shrink-0" />
            ) : report.itemData ? (
              <Package className="w-5 h-5 mr-3 text-orange-500 flex-shrink-0" />
            ) : null}
            <h3 className="font-semibold text-lg">
              {report.reportedUserData ? 'Reporte de Usuario:' : report.itemData ? 'Reporte de Ítem:' : 'Reporte General'}
            </h3>
          </div>

          {(report.reportedUserData || report.itemData) && (
            <div className="flex items-center">
              <h3 className="font-normal text-lg ml-8" title={
                report.reportedUserData ? `${report.reportedUserData.first_name} ${report.reportedUserData.last_name} ${report.reportedUserData.bgg_user ? `(${report.reportedUserData.bgg_user})` : ''}` :
                  report.itemData ? `${report.itemData.title} (#${report.itemData.assigned_trade_code})` : ''
              }>
                {report.reportedUserData ? `${report.reportedUserData.first_name} ${report.reportedUserData.last_name} ${report.reportedUserData.bgg_user && `(${report.reportedUserData.bgg_user})`}` :
                  report.itemData ? `${report.itemData.title} (#${report.itemData.assigned_trade_code})` : ''}
              </h3>
            </div>
          )}

          {report.itemData && (report.itemData.first_name || report.itemData.last_name) && (
            <div className="flex items-center mt-1">
              <UserIcon className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0 ml-8" />
              <p className="font-normal text-base text-gray-700 dark:text-gray-300">
                De: <span className="font-semibold">
                  {report.itemData.first_name} {report.itemData.last_name}
                </span>
              </p>
            </div>
          )}
        </div>

        {report.created && (
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
            {report.created}
          </span>
        )}
      </div>

      <div className="pl-8 space-y-4">
        <div className="flex items-start">
          <div className="pt-4">
            <MessageSquare className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md w-full">{report.comment}</p>
        </div>

        {report.images && (
          <div>
            <div className="flex items-center">
              <Camera className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <h4 className="font-medium text-gray-600 dark:text-gray-400">Imágenes adjuntas:</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ml-8 mt-2">
              {report.images.split(',').map((imgUrl, imgIndex) => (
                <div key={imgIndex} className="block cursor-pointer" onClick={() => onImageClick(imgUrl)}>
                  <img src={imgUrl} alt={`Imagen de reporte ${imgIndex + 1}`} className="w-full h-24 object-cover rounded-lg shadow-sm hover:opacity-80 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}