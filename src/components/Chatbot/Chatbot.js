import React, { useState } from 'react';
import {
  Drawer,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button,
  Box,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import ReactMarkdown from 'react-markdown';
import { api, sendMessage, downloadFile } from '../../services/api';

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportAvailable, setReportAvailable] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);

  const toggleDrawer = () => setOpen(!open);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const newMessage = { text: input, sender: 'user' };
    setMessages([...messages, newMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    setReportAvailable(false);
    setReportUrl(null);

    try {
      const response = await sendMessage(input);
      const botReply = { text: response.data.reply, sender: 'bot' };
      setMessages(prevMessages => [...prevMessages, botReply]);

      // Check if response contains a report URL
      if (response.data.report_url) {
        console.log('Report URL received:', response.data.report_url);
        setReportAvailable(true);
        setReportUrl(response.data.report_url);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.response?.data?.reply || 'Failed to get response from the chat server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (reportUrl) {
      try {
        console.log('Initiating download from URL:', reportUrl);
        const response = await downloadFile(reportUrl);
        
        // Create timestamp for filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `chat_report_${timestamp}.xlsx`;
        
        // Create blob and trigger download
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        // Use the same download mechanism as downloadSelected
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('Download completed successfully');
      } catch (error) {
        console.error('Download error details:', error);
        let errorMessage = 'Failed to download report';
        if (error.response?.data instanceof Blob) {
          const text = await error.response.data.text();
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Error parsing error response:', e);
          }
        }
        alert(errorMessage);
      }
    }
  };

  return (
    <>
      <IconButton
        color="primary"
        onClick={toggleDrawer}
        sx={{ position: 'fixed', right: 16, bottom: 16 }}
      >
        <ChatIcon />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={toggleDrawer}>
        <Box sx={{ width: 500, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {messages.map((msg, index) => (
              <ListItem key={index} button>
                {msg.sender === 'user' ? (
                  <ListItemText
                    primary={msg.text}
                    align="right"
                    sx={{
                      bgcolor: 'primary.light',
                      color: 'black',
                      borderRadius: 1,
                      p: 1,
                      m: 0.5,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      bgcolor: 'grey.300',
                      color: 'black',
                      borderRadius: 1,
                      p: 1,
                      m: 0.5,
                      maxWidth: '100%',
                    }}
                  >
                    {typeof msg.text === 'object' ? (
                      <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {JSON.stringify(msg.text, null, 2)}
                      </pre>
                    ) : (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    )}
                  </Box>
                )}
              </ListItem>
            ))}
            {loading && (
              <ListItem>
                <CircularProgress size={24} />
              </ListItem>
            )}
            {error && (
              <ListItem>
                <ListItemText primary={error} sx={{ color: 'error.main' }} />
              </ListItem>
            )}
          </List>
          <Box sx={{ display: 'flex', mt: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  if (e.ctrlKey || e.shiftKey) {
                    setInput((prev) => prev + '\n');
                  } else {
                    handleSend();
                  }
                  e.preventDefault();
                }
              }}
              multiline
              maxRows={4}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSend}
              sx={{ ml: 1 }}
            >
              Send
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleDownload}
              disabled={!reportAvailable}
              sx={{ ml: 1 }}
            >
              Download
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Chatbot;