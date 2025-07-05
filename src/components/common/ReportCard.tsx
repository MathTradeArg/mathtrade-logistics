/* eslint-disable @next/next/no-img-element */
import { EnrichedReport, ReportComment } from '@/types/index';
import { Camera, ChatText, Package, User as UserIcon, Plus, CaretDown, CaretUp, Trash } from 'phosphor-react';
import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { useHapticClick } from '@/hooks/useHapticClick';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { triggerHaptic } from '@/utils/haptics';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ReportCardProps {
  report: EnrichedReport;
  onImageClick: (imageUrl: string) => void;
  onReportDeleted?: (reportId: number) => void;
}

export default function ReportCard({ report, onImageClick, onReportDeleted }: ReportCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<ReportComment[]>(report.comments || []);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const { execute: addComment, isLoading: isAddingComment } = useApi<ReportComment>(`reports/${report.id}/comments/`, { method: 'POST' });
  const { execute: deleteReport, isLoading: isDeletingReport } = useApi(`reports/${report.id}/`, { method: 'DELETE' });
  const { setSuccess, setError } = useActionStatus();
  
  const handleToggleComments = useHapticClick(() => setShowComments(!showComments));
  const handleToggleAddComment = useHapticClick(() => {
    setShowAddComment(!showAddComment);
    if (showAddComment) {
      setNewComment('');
    }
  });
  
  const handleShowDeleteModal = useHapticClick(() => setShowDeleteModal(true));
  const handleCloseDeleteModal = useHapticClick(() => setShowDeleteModal(false));
  
  const handleDeleteReport = useHapticClick(async () => {
    try {
      setShowDeleteModal(false);
      
      await deleteReport();
      
      onReportDeleted?.(report.id);
      triggerHaptic(15); 
      setSuccess('Reporte eliminado exitosamente');
      
    } catch (error) {
      console.error('Error deleting report:', error);
      triggerHaptic(25); 
      setError('Error al eliminar el reporte');
    }
  });
  
  const handleSubmitComment = useHapticClick(async () => {
    if (!newComment.trim()) return;
    
    const commentText = newComment.trim();
    setNewComment('');
    setShowAddComment(false);
    
    try {
      const realComment = await addComment({ comment: commentText });
      
      if (realComment) {
        setComments(prevComments => [...prevComments, realComment]);
        triggerHaptic(15); 
        setSuccess('Comentario agregado exitosamente');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      triggerHaptic(25); 
      setError('Error al agregar el comentario');
      setNewComment(commentText);
      setShowAddComment(true);
    }
  });

  return (
    <div className="nm-surface dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-200 dark:border-gray-700">
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
            <div className="flex items-center mt-1">
              <h3 className="font-normal text-lg" title={
                report.reportedUserData ? `${report.reportedUserData.first_name} ${report.reportedUserData.last_name} ${report.reportedUserData.bgg_user ? `(${report.reportedUserData.bgg_user})` : ''}` :
                  report.itemData ? `${report.itemData.title} (#${report.itemData.assigned_trade_code})` : ''
              }>
                {report.reportedUserData ? `${report.reportedUserData.first_name} ${report.reportedUserData.last_name} ${report.reportedUserData.bgg_user && `(${report.reportedUserData.bgg_user})`}` :
                  report.itemData ? `${report.itemData.title} (#${report.itemData.assigned_trade_code})` : ''}
              </h3>
            </div>
          )}

          {report.itemData && (report.itemData.first_name || report.itemData.last_name) && (
            <div className="flex items-center mt-2">
              <UserIcon className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
              <p className="font-normal text-sm text-gray-700 dark:text-gray-300">
                De: <span className="font-semibold">
                  {report.itemData.first_name} {report.itemData.last_name}
                </span>
              </p>
            </div>
          )}
        </div>

        {report.created && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleShowDeleteModal}
              disabled={isDeletingReport}
              className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Eliminar reporte"
            >
              <Trash className="w-4 h-4" />
            </button>
            <div className="text-right">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {report.created}
              </span>
              {report.user && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Reportado por: <span className="font-medium">{report.user.first_name} {report.user.last_name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 mt-4">
        <div className="flex items-start gap-3">
          <ChatText className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md flex-1">{report.comment}</p>
        </div>

        {report.images && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Camera className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <h4 className="font-medium text-gray-600 dark:text-gray-400">Imágenes adjuntas:</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {report.images.split(',').map((imgUrl, imgIndex) => (
                <div key={imgIndex} className="block cursor-pointer" onClick={() => onImageClick(imgUrl)}>
                  <img src={imgUrl} alt={`Imagen de reporte ${imgIndex + 1}`} className="w-full h-24 object-cover rounded-lg shadow-sm hover:opacity-80 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleToggleComments}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Comentarios ({comments.length})
              {showComments ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleToggleAddComment}
              className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              title="Agregar comentario"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showComments && comments.length > 0 && (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded-r-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {comment.user_info.first_name} {comment.user_info.last_name}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {comment.created}
                    </span>
                  </div>
                  <p className="text-sm text-blue-900 dark:text-blue-100">{comment.comment}</p>
                </div>
              ))}
            </div>
          )}

          {showAddComment && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onFocus={() => triggerHaptic()}
                placeholder="Escribir comentario de seguimiento..."
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={handleToggleAddComment}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isAddingComment}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingComment ? 'Agregando...' : 'Agregar comentario'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteReport}
        itemsToDeliver={[]}
        actionType="all"
        modalTitle="Eliminar Reporte"
        mode="delete-box"
        customMessage={`¿Estás seguro de que querés eliminar este reporte? Esta acción no se puede deshacer.`}
        confirmButtonText="Eliminar reporte"
      />
    </div>
  );
}