import React, { useRef, useState } from 'react'
import { Typography, useTheme } from '@mui/material'
import { SessionType, createMessage } from '../../shared/types'
import { useTranslation } from 'react-i18next'
import * as atoms from '../stores/atoms'
import { useSetAtom } from 'jotai'
import * as sessionActions from '../stores/sessionActions'
import {
    SendHorizontal,
    Settings2,
    FileInput,
    X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import icon from '../static/icon.png'
import { trackingEvent } from '@/packages/event'
import MiniButton from './MiniButton'
import { parseFile } from '../lib/file-parsers'
import _ from 'lodash'

export interface Props {
    currentSessionId: string
    currentSessionType: SessionType
}

export default function InputBox(props: Props) {
    const theme = useTheme()
    const setChatConfigDialogSession = useSetAtom(atoms.chatConfigDialogAtom)
    const { t } = useTranslation()
    const [messageInput, setMessageInput] = useState('')
    const inputRef = useRef<HTMLTextAreaElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    const handleSubmit = async (needGenerating = true) => {
        if (messageInput.trim() === '' && selectedFiles.length === 0) {
            return
        }
        
        // Create the actual message to be sent (with file contents)
        let fullMessage = messageInput;
        
        // Process selected files if any
        if (selectedFiles.length > 0) {
            for (let i = 0; i < selectedFiles.length; i++) {
                try {
                    const fileContent = await parseFile(selectedFiles[i]);
                    const formattedAttachment = `\n\n<ATTACHMENT_FILE>\n<FILE_INDEX>${i}</FILE_INDEX>\n<FILE_NAME>${selectedFiles[i].name}</FILE_NAME>\n<FILE_CONTENT>\n${fileContent}\n</FILE_CONTENT>\n</ATTACHMENT_FILE>\n`;
                    fullMessage += formattedAttachment;
                } catch (error) {
                    console.error(`Error reading file ${selectedFiles[i].name}:`, error);
                    // Add error message for this file
                    fullMessage += `\n\n<ATTACHMENT_FILE>\n<FILE_INDEX>${i}</FILE_INDEX>\n<FILE_NAME>${selectedFiles[i].name}</FILE_NAME>\n<FILE_CONTENT>\nError reading file: ${error.message}\n</FILE_CONTENT>\n</ATTACHMENT_FILE>\n`;
                }
            }
        }
        
        const messageToSend = createMessage('user', fullMessage);
        
        sessionActions.submitNewUserMessage({
            currentSessionId: props.currentSessionId,
            newUserMsg: messageToSend,
            needGenerating,
        });
        
        setMessageInput('');
        setSelectedFiles([]);
        trackingEvent('send_message', { event_category: 'user', with_attachments: selectedFiles.length > 0 });
    }

    const minTextareaHeight = 66
    const maxTextareaHeight = 96

    const onMessageInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const input = event.target.value
        setMessageInput(input)
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (
            event.keyCode === 13 &&
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
        ) {
            event.preventDefault()
            handleSubmit()
            return
        }
        if (event.keyCode === 13 && event.ctrlKey) {
            event.preventDefault()
            handleSubmit(false)
            return
        }
    }

    const [easterEgg, setEasterEgg] = useState(false)

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const filesArray = Array.from(event.target.files)
            setSelectedFiles(prev => [...prev, ...filesArray])
            // Reset file input value to allow selecting the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const removeFile = (fileIndex: number) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== fileIndex))
    }

    return (
        <div className='pl-2 pr-4'
            style={{
                borderTopWidth: '1px',
                borderTopStyle: 'solid',
                borderTopColor: theme.palette.divider,
            }}
        >
            <div className={cn('w-full mx-auto flex flex-col')}>
                <div className='flex flex-row flex-nowrap justify-between py-1'>
                    <div className='flex flex-row items-center'>
                        <MiniButton className='mr-2 hover:bg-transparent' style={{ color: theme.palette.text.primary }}
                            onClick={() => {
                                setEasterEgg(true)
                                setTimeout(() => setEasterEgg(false), 1000)
                            }}
                        >
                            <img className={cn('w-5 h-5', easterEgg ? 'animate-spin' : '')} src={icon} />
                        </MiniButton>
                        <MiniButton className='mr-2' style={{ color: theme.palette.text.primary }}
                            onClick={() => setChatConfigDialogSession(sessionActions.getCurrentSession())}
                            tooltipTitle={
                                <div className='text-center inline-block'>
                                    <span>{t('Customize settings for the current conversation')}</span>
                                </div>
                            }
                            tooltipPlacement='top'
                        >
                            <Settings2 size='22' strokeWidth={1} />
                        </MiniButton>
                        <MiniButton className='mr-2' style={{ color: theme.palette.text.primary }}
                            onClick={() => fileInputRef.current?.click()}
                            tooltipTitle={
                                <div className='text-center inline-block'>
                                    <span>{t('Select files')}</span>
                                </div>
                            }
                            tooltipPlacement='top'
                        >
                            <FileInput size='22' strokeWidth={1} />
                        </MiniButton>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                            multiple
                        />
                    </div>
                    <div className='flex flex-row items-center'>
                        <MiniButton className='w-8 ml-2'
                            style={{
                                color: theme.palette.getContrastText(theme.palette.primary.main),
                                backgroundColor: theme.palette.primary.main,
                            }}
                            tooltipTitle={
                                <Typography variant="caption">
                                    {t('[Enter] send, [Shift+Enter] line break, [Ctrl+Enter] send without generating')}
                                </Typography>
                            }
                            tooltipPlacement='top'
                            onClick={() => handleSubmit()}
                        >
                            <SendHorizontal size='22' strokeWidth={1} />
                        </MiniButton>
                    </div>
                </div>
                <div className='w-full pl-1 pb-2'>
                    <textarea
                        className={cn(
                            `w-full max-h-[${maxTextareaHeight}px]`,
                            'overflow-y resize-none border-none outline-none',
                            'bg-transparent p-1'
                        )}
                        value={messageInput} onChange={onMessageInput}
                        onKeyDown={onKeyDown}
                        ref={inputRef}
                        style={{
                            height: 'auto',
                            minHeight: minTextareaHeight + 'px',
                            color: theme.palette.text.primary,
                            fontFamily: theme.typography.fontFamily,
                            fontSize: theme.typography.body1.fontSize,
                        }}
                        placeholder={t('Type your question here...') || ''}
                    />
                    <div className='flex flex-row flex-wrap items-center'>
                        {selectedFiles.map((file, index) => (
                            <div 
                                key={index} 
                                className='flex items-center mr-2 mb-1 px-2 py-1 rounded-md text-sm'
                                style={{ backgroundColor: theme.palette.action.selected }}
                            >
                                <span className='mr-1 text-xs' style={{ color: theme.palette.text.primary }}>
                                    {file.name}
                                </span>
                                <button 
                                    onClick={() => removeFile(index)}
                                    className='hover:bg-gray-300 rounded-full p-0.5'
                                    style={{ color: theme.palette.text.secondary }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
