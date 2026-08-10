import React, { useState } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useCalendar } from '../contexts/CalendarContext';
import { useProjects } from '../contexts/ProjectsContext';
import { formatDurationFriendly } from '../utils/time';
import { Search, Filter, MoreVertical, Clock, Play, Calendar as CalendarIcon, CheckSquare, ChevronRight, Briefcase, GraduationCap, Home, ChefHat, Dumbbell, Plane, Folder, ChevronLeft, ArrowLeft, Plus, Edit3, ArrowUpDown, PersonStanding, Code, Music, Palette, Camera, ShoppingCart, Users, Car, Gamepad2, Heart, Coffee } from 'lucide-react';
import { audio } from '../utils/audio';
import { useFocus } from '../contexts/FocusContext';
import { useNavigation } from '../contexts/NavigationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { RichTextEditor } from '../components/RichTextEditor';

const iconMap: Record<string, any> = {
  Briefcase, GraduationCap, Home, ChefHat, Dumbbell, Plane, Folder,
  PersonStanding, Code, Music, Palette, Camera, ShoppingCart, Users, Car, Gamepad2, Heart, Coffee
};

export const OrganizeView: React.FC = () => {
  const { tasks, updateTaskStatus, updateTask } = useTasks();
  const { events, updateEvent } = useCalendar();
  const { projects, addProject, updateProject } = useProjects();
  const { startTimer } = useFocus();
  const { setActiveTab: setGlobalActiveTab, openSmartInput } = useNavigation();
  
  const [activeTab, setActiveTab] = useState<'feed' | 'projects'>('feed');
  const [feedFilter, setFeedFilter] = useState<'prox' | 'todos' | 'eventos' | 'tarefas'>('todos');
  const [projectFilter, setProjectFilter] = useState<'todos' | 'recentes' | 'prazo' | 'ativos'>('todos');
  
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [editingProjectDesc, setEditingProjectDesc] = useState<string | null>(null);
  const [draftDescription, setDraftDescription] = useState('');
  const [todosSortOrder, setTodosSortOrder] = useState<'desc' | 'asc'>('desc');

  const handlePlay = (task: any) => {
    audio.playClick();
    startTimer(task, task.estimatedDuration);
    setGlobalActiveTab('focus');
  };

  // --- FEED VIEW LOGIC ---
  const feedItemsRaw = [
    ...tasks.map(t => ({ ...t, type: 'task' as const, dateObj: new Date(t.createdAt), creationTime: new Date(t.createdAt).getTime() })),
    ...events.map(e => {
       const timestampMatch = e.id.match(/_(17\d{11})/);
       const creationTime = timestampMatch ? parseInt(timestampMatch[1], 10) : new Date(`${e.date}T${e.start}`).getTime();
       return { ...e, type: 'event' as const, dateObj: new Date(`${e.date}T${e.start}`), creationTime };
    })
  ];

  const filteredFeed = feedItemsRaw.filter(item => {
    if (feedFilter === 'eventos') {
      if (item.type !== 'event') return false;
      const now = new Date();
      return item.dateObj.getTime() > now.getTime();
    }
    if (feedFilter === 'tarefas') return item.type === 'task';
    if (feedFilter === 'prox') {
       if (item.type === 'task') return item.status === 'pending';
       if (item.type === 'event') {
          const now = new Date();
          return item.dateObj.getTime() > now.getTime();
       }
    }
    return true;
  }).sort((a, b) => {
    if (feedFilter === 'todos') {
      return todosSortOrder === 'desc' 
        ? b.creationTime - a.creationTime 
        : a.creationTime - b.creationTime;
    }
    if (feedFilter === 'eventos' || feedFilter === 'prox') {
      return a.dateObj.getTime() - b.dateObj.getTime(); // Nearest first
    }
    return b.creationTime - a.creationTime;
  });

  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;
  const todaysEventsCount = events.filter(e => e.date === new Date().toISOString().split('T')[0]).length;

  const renderFeedItem = (item: any) => {
    const isTask = item.type === 'task';
    const isCompleted = isTask && item.status === 'completed';
    const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;
    const ProjectIcon = project ? (iconMap[project.icon] || Folder) : null;

    return (
      <div 
        key={`${item.type}-${item.id}`} 
        className={`group flex items-center justify-between p-3.5 mb-2 card-standard ${
          isCompleted 
            ? 'opacity-60 grayscale !border-transparent !shadow-none' 
            : 'hover:border-brand-300 dark:hover:border-brand-700'
        }`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Timeline indicator or Checkbox */}
          {isTask ? (
            <button 
              onClick={() => {
                audio.playClick();
                updateTaskStatus(item.id, isCompleted ? 'pending' : 'completed');
              }}
              className={`w-5 h-5 shrink-0 rounded-full border-2 mt-0.5 flex items-center justify-center transition-colors ${
                isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {isCompleted && <CheckSquare className="w-3 h-3 text-white" />}
            </button>
          ) : (
            <div className="flex flex-col items-center shrink-0 w-12 mt-0.5">
              <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 leading-tight whitespace-nowrap">
                {item.start === '00:00' && item.end === '23:59' ? item.date.split('-').reverse().slice(0, 2).join('/') : item.start}
              </span>
              <span className="text-[9px] text-text-secondary leading-tight whitespace-nowrap">
                 {item.start === '00:00' && item.end === '23:59' ? 'Todo dia' : `- ${item.end}`}
              </span>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0 pl-1 border-l-2 border-transparent" style={{ borderLeftColor: isTask ? 'transparent' : item.color }}>
            <div className="pl-2">
              <p className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                {item.title}
              </p>
              
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {isTask ? (
                  <span className="text-[9px] font-bold text-text-secondary flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDurationFriendly(item.estimatedDuration)}
                    <span className={`px-1.5 py-0.5 rounded ml-1 ${
                      item.size === 'Grande' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
                      item.size === 'Média' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' :
                      'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400'
                    }`}>
                      {item.size}
                    </span>
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-text-secondary flex items-center gap-1">
                    <CalendarIcon className="w-2.5 h-2.5" />
                    {item.source === 'google' ? 'Google Agenda' : 'Agenda Local'}
                  </span>
                )}

                {project && ProjectIcon && (
                  <button 
                    onClick={() => setSelectedProject(project.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" 
                    style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: project.color.includes('text-') ? undefined : 'var(--text-secondary)' }}
                  >
                    <ProjectIcon className="w-2.5 h-2.5" />
                    {project.title}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action button */}
        <div className="flex flex-col items-end shrink-0 ml-2">
           <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300 font-bold mb-2">
             {isTask ? 'Tarefa' : 'Evento'}
           </span>
           {isTask && !isCompleted ? (
              <button 
                onClick={() => handlePlay(item)}
                className="w-8 h-8 rounded-full border border-brand-200 text-brand-500 flex items-center justify-center hover:bg-brand-50"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </button>
           ) : (
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === item.id ? null : item.id); }}
                  className="w-8 h-8 flex items-center justify-center text-text-secondary rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {activeDropdown === item.id && (
                  <div className="absolute right-0 top-10 w-48 bg-card-bg border border-border-color rounded-xl shadow-lg z-50 py-1" onClick={(e) => e.stopPropagation()}>
                    <div className="px-3 py-1.5 border-b border-border-color">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Mover para projeto</span>
                    </div>
                    {projects.length === 0 && (
                      <div className="px-3 py-2 text-xs text-text-secondary italic">Nenhum projeto</div>
                    )}
                    {projects.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => {
                          if (isTask) updateTask(item.id, { projectId: p.id });
                          else updateEvent(item.id, { projectId: p.id });
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20"
                      >
                        {p.title}
                      </button>
                    ))}
                    {item.projectId && (
                      <button 
                        onClick={() => {
                          if (isTask) updateTask(item.id, { projectId: undefined });
                          else updateEvent(item.id, { projectId: undefined });
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-t border-border-color"
                      >
                        Remover do projeto
                      </button>
                    )}
                  </div>
                )}
              </div>
           )}
        </div>
      </div>
    );
  };

  // --- PROJECTS VIEW LOGIC ---
  const renderProjectCard = (project: any) => {
    const Icon = iconMap[project.icon] || Folder;
    const pTasks = tasks.filter(t => t.projectId === project.id);
    const pEvents = events.filter(e => e.projectId === project.id);
    const pendingCount = pTasks.filter(t => t.status === 'pending').length;
    const completedCount = pTasks.filter(t => t.status === 'completed').length;
    const total = pTasks.length;
    const progress = total === 0 ? 0 : Math.round((completedCount / total) * 100);

    return (
      <div 
        key={project.id} 
        onClick={() => setSelectedProject(project.id)}
        className="card-standard p-4 mb-3 cursor-pointer hover:border-brand-300 transition-colors"
      >
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${project.color.split(' ')[1] || 'bg-gray-100'}`}>
             <Icon className={`w-7 h-7 ${project.color.split(' ')[0] || 'text-gray-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
             <div className="flex justify-between items-start mb-1">
                <h3 className="text-base font-bold text-text-primary truncate">{project.title}</h3>
                <span className="text-[10px] font-bold text-brand-600">{pendingCount} pendentes</span>
             </div>
             <p className="text-[11px] text-text-secondary truncate mb-3">{project.description}</p>
             
             <div className="flex items-center justify-between mt-2">
                <div className="flex gap-3 text-[10px] text-text-secondary font-semibold">
                   <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" /> {total} tarefas</span>
                   <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {pEvents.length} eventos</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                     <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: 'currentColor', color: project.color.split(' ')[0].replace('text-', '') }}></div>
                   </div>
                   <span className="text-[10px] font-bold text-text-secondary">{progress}%</span>
                   <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  if (selectedProject) {
    const project = projects.find(p => p.id === selectedProject);
    const pTasks = tasks.filter(t => t.projectId === selectedProject);
    const pEvents = events.filter(e => e.projectId === selectedProject);

    const ProjectIcon = project ? (iconMap[project.icon] || Folder) : Folder;

    return (
      <div className="relative h-full flex flex-col bg-app-bg overflow-hidden animate-slide-in-right" onClick={() => setActiveDropdown(null)}>
        <div className="px-5 pt-6 pb-4 border-b border-border-color">
           <div className="flex items-center justify-between mb-4">
             <button onClick={() => setSelectedProject(null)} className="w-8 h-8 rounded-full bg-card-bg border border-border-color flex items-center justify-center">
               <ChevronLeft className="w-4 h-4" />
             </button>
             <button className="w-8 h-8 flex items-center justify-center">
               <MoreVertical className="w-5 h-5 text-text-secondary" />
             </button>
           </div>
           
           {project && (
             <div className="flex items-start gap-4">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${project.color.split(' ')[1] || 'bg-gray-100'}`}>
                 <ProjectIcon className={`w-7 h-7 ${project.color.split(' ')[0] || 'text-gray-600'}`} />
               </div>
               <div className="flex-1">
                 <h2 className="text-xl font-bold text-text-primary">{project.title}</h2>
                 <div className="flex gap-3 text-[11px] text-text-secondary font-semibold mt-1">
                   <span className="flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5" /> {pTasks.length} tarefas</span>
                   <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {pEvents.length} eventos</span>
                 </div>
               </div>
             </div>
           )}
           
           {/* Adicionar detalhes... */}
           <div className="mt-4">
             <div 
               onClick={() => {
                 setDraftDescription(project?.description || '');
                 setEditingProjectDesc(project?.id || null);
               }}
               className={`flex items-center gap-2 p-3 rounded-xl border border-border-color cursor-text bg-card-bg/50 hover:bg-card-bg transition-colors ${project?.description ? 'text-text-primary text-sm' : 'text-text-secondary text-sm italic'}`}
             >
               <Edit3 className="w-4 h-4 text-brand-500 shrink-0" />
               <div className="line-clamp-2 w-full text-left" dangerouslySetInnerHTML={{ __html: project?.description || 'Adicionar detalhes...' }} />
             </div>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-[110px] custom-scrollbar">
           {pEvents.length === 0 && pTasks.length === 0 && (
             <div className="text-center py-10">
               <p className="text-sm text-text-secondary mb-4">Projeto vazio.</p>
               <button onClick={() => openSmartInput(false)} className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2">
                 <Plus className="w-4 h-4" /> Adicionar Item
               </button>
             </div>
           )}
           {pEvents.map(e => renderFeedItem({ ...e, type: 'event' }))}
           {pTasks.map(t => renderFeedItem({ ...t, type: 'task' }))}
        </div>

        {/* Full Screen Description Editor Modal */}
        {project && editingProjectDesc === project.id && (
          <div className="fixed inset-0 bg-app-bg z-[200] flex flex-col animate-slide-up">
            <div className="flex-1 overflow-hidden">
              <RichTextEditor 
                value={draftDescription}
                onChange={setDraftDescription}
                placeholder="Digite todos os detalhes aqui..."
                autoFocus
                leftAction={
                  <button 
                    onClick={() => {
                      updateProject(project.id, { description: draftDescription });
                      setEditingProjectDesc(null);
                    }}
                    className="w-10 h-10 rounded-xl bg-app-bg border border-border-color flex items-center justify-center hover:bg-border-color/50 active:scale-95 transition-all text-text-primary shadow-sm"
                    title="Voltar"
                  >
                    <ArrowLeft className="w-5 h-5 text-brand-500" />
                  </button>
                }
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-app-bg overflow-hidden animate-fade-in">
      
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Organizar</h2>
            <p className="text-xs text-text-secondary">Seu feed completo de eventos e tarefas</p>
          </div>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full flex items-center justify-center bg-card-bg border border-border-color"><Search className="w-4 h-4" /></button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center bg-card-bg border border-border-color"><Filter className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex bg-card-bg p-1 rounded-xl border border-border-color mb-4 relative">
          <div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-brand-50 dark:bg-brand-900/20 rounded-lg shadow-sm border border-brand-200/50 dark:border-brand-700/30 transition-all duration-300 ease-spring"
            style={{ left: activeTab === 'feed' ? '4px' : 'calc(50%)' }}
          />
          <button
            onClick={() => { audio.playClick(); setActiveTab('feed'); }}
            className={`flex-1 py-2 text-[11px] font-bold flex items-center justify-center gap-2 relative z-10 transition-colors ${
              activeTab === 'feed' ? 'text-brand-600 dark:text-brand-400' : 'text-text-secondary'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" /> Feed
          </button>
          <button
            onClick={() => { audio.playClick(); setActiveTab('projects'); }}
            className={`flex-1 py-2 text-[11px] font-bold flex items-center justify-center gap-2 relative z-10 transition-colors ${
              activeTab === 'projects' ? 'text-brand-600 dark:text-brand-400' : 'text-text-secondary'
            }`}
          >
            <Folder className="w-3.5 h-3.5" /> Projetos
          </button>
        </div>
        
        {/* Filters */}
        {activeTab === 'feed' ? (
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar items-center">
            {['prox', 'todos', 'eventos', 'tarefas'].map((f) => (
              <button
                key={f}
                onClick={() => { audio.playClick(); setFeedFilter(f as any); }}
                className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                  feedFilter === f 
                    ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-400' 
                    : 'bg-card-bg border-border-color text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {f === 'prox' ? <Clock className="w-3 h-3" /> : null}
                {f === 'todos' ? <Folder className="w-3 h-3" /> : null}
                {f === 'eventos' ? <CalendarIcon className="w-3 h-3" /> : null}
                {f === 'tarefas' ? <CheckSquare className="w-3 h-3" /> : null}
                {f === 'prox' ? 'Próximos' : f === 'todos' ? 'Todos' : f === 'eventos' ? 'Eventos' : 'Tarefas'}
              </button>
            ))}
            {feedFilter === 'todos' && (
              <button
                onClick={() => { audio.playClick(); setTodosSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}
                className="ml-auto shrink-0 px-2 py-1.5 text-text-secondary hover:text-brand-600 transition-colors flex items-center justify-center bg-card-bg rounded-lg border border-border-color"
                title="Inverter ordem de criação"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['todos', 'recentes', 'prazo', 'ativos'].map((f) => (
              <button
                key={f}
                onClick={() => { audio.playClick(); setProjectFilter(f as any); }}
                className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${
                  projectFilter === f 
                    ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-400' 
                    : 'bg-card-bg border-border-color text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content (Swipeable/Animated) */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} mode="wait">
          {activeTab === 'feed' ? (
            <motion.div 
              key="feed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-y-auto px-5 pb-[110px] custom-scrollbar"
            >
              {/* Daily summary pill */}
              <div className="flex justify-between items-center mb-4 px-2">
                 <span className="text-xs font-bold text-brand-600">Hoje, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span>
                 <button className="text-[10px] font-bold text-brand-600 flex items-center gap-1">
                   <CalendarIcon className="w-3 h-3" /> Ver calendário
                 </button>
              </div>

              {filteredFeed.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-text-secondary">Nenhum item encontrado.</p>
                </div>
              ) : (
                filteredFeed.map(renderFeedItem)
              )}

              {/* Summary Bottom */}
              <div className="mt-6 flex justify-between bg-card-bg p-3 rounded-2xl border border-border-color">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center"><CheckSquare className="w-4 h-4" /></div>
                   <div>
                     <p className="text-[10px] font-bold leading-tight">{feedItemsRaw.length} itens</p>
                     <p className="text-[9px] text-text-secondary leading-tight">hoje</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 border-l border-border-color pl-4">
                   <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center"><CalendarIcon className="w-4 h-4" /></div>
                   <div>
                     <p className="text-[10px] font-bold leading-tight">{todaysEventsCount} eventos</p>
                     <p className="text-[9px] text-text-secondary leading-tight">hoje</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 border-l border-border-color pl-4">
                   <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center"><CheckSquare className="w-4 h-4" /></div>
                   <div>
                     <p className="text-[10px] font-bold leading-tight">{pendingTasksCount} tarefas</p>
                     <p className="text-[9px] text-text-secondary leading-tight">pendentes</p>
                   </div>
                 </div>
              </div>

            </motion.div>
          ) : (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-y-auto px-5 pb-[110px] custom-scrollbar"
            >
              {projects.length === 0 && !isCreatingProject ? (
                <div className="text-center py-10">
                  <p className="text-sm text-text-secondary mb-4">Nenhum projeto ainda.</p>
                  <button onClick={() => setIsCreatingProject(true)} className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Criar Projeto
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {isCreatingProject && (
                    <div className="card-standard p-4 mb-3 border-brand-300">
                      <p className="text-[10px] font-bold text-brand-600 mb-2 uppercase">Novo Projeto</p>
                      <input 
                        autoFocus
                        className="w-full bg-transparent border-b border-brand-200 text-base font-bold py-1 focus:outline-none mb-3"
                        placeholder="Nome do projeto (ex: Viagem, Casa...)"
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newProjectTitle.trim()) {
                            addProject(newProjectTitle.trim());
                            setNewProjectTitle('');
                            setIsCreatingProject(false);
                          }
                        }}
                      />
                      <div className="flex justify-end gap-2">
                         <button onClick={() => setIsCreatingProject(false)} className="text-xs font-bold text-text-secondary px-3 py-1.5">Cancelar</button>
                         <button 
                           onClick={() => {
                             if (newProjectTitle.trim()) {
                               addProject(newProjectTitle.trim());
                               setNewProjectTitle('');
                               setIsCreatingProject(false);
                             }
                           }}
                           className="text-xs font-bold text-brand-600 px-3 py-1.5 bg-brand-50 rounded-lg"
                         >
                           Criar
                         </button>
                      </div>
                    </div>
                  )}
                  {projects.map(renderProjectCard)}
                  {!isCreatingProject && projects.length > 0 && (
                    <button onClick={() => setIsCreatingProject(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-border-color text-text-secondary text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Plus className="w-4 h-4" /> Novo Projeto
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
