import { useEffect, useState, useRef } from 'react'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import {
    Typography,
    Grid,
    useTheme,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import SettingsIcon from '@mui/icons-material/Settings'
import { useTranslation } from 'react-i18next'
import { Message, SessionType } from '../../shared/types'
import { useAtomValue, useSetAtom } from 'jotai'
import {
    showMessageTimestampAtom,
    showModelNameAtom,
    showTokenCountAtom,
    showWordCountAtom,
    openSettingDialogAtom,
    enableMarkdownRenderingAtom,
} from '../stores/atoms'
import { currsentSessionPicUrlAtom, showTokenUsedAtom } from '../stores/atoms'
import * as scrollActions from '../stores/scrollActions'
import Markdown from '@/components/Markdown'
import '../static/Block.css'
import MessageErrTips from './MessageErrTips'
import * as dateFns from "date-fns"
import { cn } from '@/lib/utils'
import { estimateTokensFromMessages } from '@/packages/token'
import { countWord } from '@/packages/word-count'
import { Paperclip } from 'lucide-react'

export interface Props {
    id?: string
    sessionId: string
    sessionType: SessionType
    msg: Message
    className?: string
    collapseThreshold?: number
    hiddenButtonGroup?: boolean
    small?: boolean
}

export default function Message(props: Props) {
    const { t } = useTranslation()
    const theme = useTheme()

    const showMessageTimestamp = useAtomValue(showMessageTimestampAtom)
    const showModelName = useAtomValue(showModelNameAtom)
    const showTokenCount = useAtomValue(showTokenCountAtom)
    const showWordCount = useAtomValue(showWordCountAtom)
    const showTokenUsed = useAtomValue(showTokenUsedAtom)
    const enableMarkdownRendering = useAtomValue(enableMarkdownRenderingAtom)
    const currentSessionPicUrl = useAtomValue(currsentSessionPicUrlAtom)
    const setOpenSettingWindow = useSetAtom(openSettingDialogAtom)

    const { msg, className, collapseThreshold, hiddenButtonGroup, small } = props

    // Process message content to extract file attachments
    const processMessageContent = (content: string) => {
        if (typeof content !== 'string') {
            return { displayContent: content, attachments: [] }
        }

        const attachmentRegex = /<ATTACHMENT_FILE>[\s\S]*?<\/ATTACHMENT_FILE>/g
        const fileIndexRegex = /<FILE_INDEX>(.*?)<\/FILE_INDEX>/
        const fileNameRegex = /<FILE_NAME>(.*?)<\/FILE_NAME>/
        
        let displayContent = content
        const attachments: { index: number, name: string }[] = []
        
        // Find all attachments in the content
        const attachmentMatches = content.match(attachmentRegex)
        if (attachmentMatches) {
            attachmentMatches.forEach(match => {
                const indexMatch = match.match(fileIndexRegex)
                const nameMatch = match.match(fileNameRegex)
                
                if (indexMatch && nameMatch) {
                    attachments.push({
                        index: parseInt(indexMatch[1]),
                        name: nameMatch[1]
                    })
                }
                
                // Remove the attachment content from display
                displayContent = displayContent.replace(match, '')
            })
            
            // Trim any extra whitespace that might have been left
            displayContent = displayContent.trim()
        }
        
        return { displayContent, attachments }
    }

    const { displayContent, attachments } = processMessageContent(msg.content)

    const needCollapse = collapseThreshold
        && (JSON.stringify(displayContent)).length > collapseThreshold
        && (JSON.stringify(displayContent)).length - collapseThreshold > 50
    const [isCollapsed, setIsCollapsed] = useState(needCollapse)

    const ref = useRef<HTMLDivElement>(null)

    const tips: string[] = []
    if (props.sessionType === 'chat' || !props.sessionType) {
        if (showWordCount && !msg.generating) {
            tips.push(`word count: ${msg.wordCount !== undefined ? msg.wordCount : countWord(displayContent)}`)
        }
        if (showTokenCount && !msg.generating) {
            if (msg.tokenCount === undefined) {
                msg.tokenCount = estimateTokensFromMessages([{...msg, content: displayContent}])
            }
            tips.push(`token count: ${msg.tokenCount}`)
        }
        if (showTokenUsed && msg.role === 'assistant' && !msg.generating) {
            tips.push(`tokens used: ${msg.tokensUsed || 'unknown'}`)
        }
        if (showModelName && props.msg.role === 'assistant') {
            tips.push(`model: ${props.msg.model || 'unknown'}`)
        }
    }

    if (showMessageTimestamp && msg.timestamp !== undefined) {
        let date = new Date(msg.timestamp)
        let messageTimestamp: string
        if (dateFns.isToday(date)) {
            messageTimestamp = dateFns.format(date, 'HH:mm')
        } else if (dateFns.isThisYear(date)) {
            messageTimestamp = dateFns.format(date, 'MM-dd HH:mm')
        } else {
            messageTimestamp = dateFns.format(date, 'yyyy-MM-dd HH:mm')
        }

        tips.push('time: ' + messageTimestamp)
    }

    useEffect(() => {
        if (msg.generating) {
            scrollActions.scrollToBottom()
        }
    }, [msg.content])

    let content = displayContent
    if (typeof displayContent !== 'string') {
        content = JSON.stringify(displayContent)
    }
    if (msg.generating) {
        content += '...'
    }
    if (needCollapse && isCollapsed) {
        content = displayContent.slice(0, collapseThreshold) + '... '
    }

    const CollapseButton = (
        <span
            className='cursor-pointer inline-block font-bold text-blue-500 hover:text-white hover:bg-blue-500'
            onClick={() => setIsCollapsed(!isCollapsed)}
        >
            [{isCollapsed ? t('Expand') : t('Collapse')}]
        </span>
    )

    return (
        <Box
            ref={ref}
            id={props.id}
            key={msg.id}
            className={cn(
                'group/message',
                'msg-block',
                'px-2',
                msg.generating ? 'rendering' : 'render-done',
                {
                    user: 'user-msg',
                    system: 'system-msg',
                    assistant: 'assistant-msg',
                }[msg?.role || 'user'],
                className,
            )}
            sx={{
                margin: '0',
                paddingBottom: '0.1rem',
                paddingX: '1rem',
                [theme.breakpoints.down('sm')]: {
                    paddingX: '0.3rem',
                },
            }}
        >
            <Grid container wrap="nowrap" spacing={1.5}>
                <Grid item>
                    <Box sx={{ marginTop: '8px' }}>
                        {
                            {
                                assistant: currentSessionPicUrl ? (
                                    <Avatar
                                        src={currentSessionPicUrl}
                                        sx={{
                                            width: '28px',
                                            height: '28px',
                                        }}
                                    />
                                ) : (
                                    <Avatar
                                        sx={{
                                            backgroundColor: theme.palette.primary.main,
                                            width: '28px',
                                            height: '28px',
                                        }}
                                    >
                                        <SmartToyIcon fontSize='small' />
                                    </Avatar>
                                ),
                                user: (
                                    <Avatar
                                        sx={{
                                            width: '28px',
                                            height: '28px',
                                        }}
                                        className='cursor-pointer'
                                        onClick={() => setOpenSettingWindow('chat')}
                                    >
                                        <PersonIcon fontSize='small' />
                                    </Avatar>
                                ),
                                system:
                                        <Avatar
                                            sx={{
                                                backgroundColor: theme.palette.warning.main,
                                                width: '28px',
                                                height: '28px',
                                            }}
                                        >
                                            <SettingsIcon fontSize='small' />
                                        </Avatar>
                            }[msg.role]
                        }
                    </Box>
                </Grid>
                <Grid item xs sm container sx={{ width: '0px', paddingRight: '15px' }}>
                    <Grid item xs>
                        <Box className={cn('msg-content', { 'msg-content-small': small })} sx={
                            small ? { fontSize: theme.typography.body2.fontSize } : {}
                        }>
                            {
                                enableMarkdownRendering && !isCollapsed ? (
                                    <Markdown>
                                        {content}
                                    </Markdown>
                                ) : (
                                    <div>
                                        {content}
                                        {
                                            needCollapse && isCollapsed && (
                                                CollapseButton
                                            )
                                        }
                                    </div>
                                )
                            }
                            
                            {/* Display file attachments */}
                            {attachments.length > 0 && (
                                <div className="mt-2">
                                    {attachments.map((file, index) => (
                                        <div 
                                            key={index} 
                                            className="flex items-center rounded-md px-3 py-1 mb-1 mr-2 inline-block"
                                            style={{ backgroundColor: theme.palette.action.selected }}
                                        >
                                            <Paperclip size={14} className="mr-1" />
                                            <span className="text-xs" style={{ color: theme.palette.text.primary }}>
                                                {file.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Box>
                        <MessageErrTips msg={msg} />
                        {
                            needCollapse && !isCollapsed && CollapseButton
                        }
                        <Typography variant="body2" sx={{ opacity: 0.5, paddingBottom: '2rem' }}>
                            {tips.join(', ')}
                        </Typography>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    )
}
